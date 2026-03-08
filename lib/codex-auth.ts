/**
 * Reads Codex CLI OAuth tokens from ~/.codex/auth.json (or CODEX_HOME).
 * These tokens authenticate against OpenAI's ChatGPT backend via OAuth
 * instead of a paid Platform API key.
 *
 * Token lifecycle:
 *   admin runs `codex login --device-auth`
 *     → tokens stored in auth.json
 *     → this module reads them
 *     → used as Bearer token for OpenAI API
 *     → refresh_token used to get new access_token when expired
 */

import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

interface CodexTokens {
  id_token: string;
  access_token: string;
  refresh_token: string;
  account_id: string;
}

interface CodexAuth {
  OPENAI_API_KEY: string | null;
  tokens: CodexTokens | null;
  last_refresh: string;
}

let cachedAuth: CodexAuth | null = null;
let cacheTime = 0;
const CACHE_TTL = 30_000; // re-read file every 30s

function getCodexHome(): string {
  return process.env.CODEX_HOME || join(homedir(), ".codex");
}

function getAuthPath(): string {
  return join(getCodexHome(), "auth.json");
}

/** Parse JWT expiration without a library */
function getJwtExp(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );
    return typeof payload.exp === "number" ? payload.exp : null;
  } catch {
    return null;
  }
}

/** Read and cache auth.json */
async function readAuth(): Promise<CodexAuth | null> {
  const now = Date.now();
  if (cachedAuth && now - cacheTime < CACHE_TTL) {
    return cachedAuth;
  }

  try {
    const raw = await readFile(getAuthPath(), "utf-8");
    cachedAuth = JSON.parse(raw) as CodexAuth;
    cacheTime = now;
    return cachedAuth;
  } catch {
    cachedAuth = null;
    return null;
  }
}

/** Refresh the access_token using the refresh_token */
async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  try {
    const res = await fetch("https://auth.openai.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        client_id: "app_EMoamEEZ73f0CkXaXp7hrann", // Codex CLI client ID
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      console.error(
        `[codex-auth] Refresh failed: ${res.status} ${res.statusText}`,
      );
      return null;
    }

    const data = (await res.json()) as {
      access_token: string;
      id_token?: string;
      refresh_token?: string;
    };

    // Update the cached auth and write back to disk
    const auth = await readAuth();
    if (auth?.tokens) {
      auth.tokens.access_token = data.access_token;
      if (data.id_token) auth.tokens.id_token = data.id_token;
      if (data.refresh_token) auth.tokens.refresh_token = data.refresh_token;
      auth.last_refresh = new Date().toISOString();

      await writeFile(getAuthPath(), JSON.stringify(auth, null, 2), "utf-8");
      cachedAuth = auth;
      cacheTime = Date.now();
    }

    return data.access_token;
  } catch (err) {
    console.error("[codex-auth] Refresh error:", err);
    return null;
  }
}

/**
 * Get a valid access token for OpenAI API calls.
 * Refreshes automatically if expired.
 * Returns null if no OAuth session exists.
 */
export async function getAccessToken(): Promise<string | null> {
  const auth = await readAuth();

  if (!auth?.tokens?.access_token) {
    return null;
  }

  const exp = getJwtExp(auth.tokens.access_token);
  const now = Math.floor(Date.now() / 1000);

  // If token expires in less than 5 minutes, refresh
  if (exp && exp - now < 300) {
    console.log("[codex-auth] Token expiring soon, refreshing...");
    const newToken = await refreshAccessToken(auth.tokens.refresh_token);
    return newToken;
  }

  return auth.tokens.access_token;
}

/**
 * Get OAuth session status info (for admin dashboard).
 */
export async function getOAuthStatus(): Promise<{
  connected: boolean;
  email: string | null;
  plan: string | null;
  expiresAt: string | null;
  lastRefresh: string | null;
}> {
  const auth = await readAuth();

  if (!auth?.tokens?.access_token) {
    return {
      connected: false,
      email: null,
      plan: null,
      expiresAt: null,
      lastRefresh: null,
    };
  }

  // Decode id_token to get email and plan info
  let email: string | null = null;
  let plan: string | null = null;

  try {
    const parts = auth.tokens.id_token.split(".");
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );
    email = payload.email ?? null;
    plan =
      payload["https://api.openai.com/auth"]?.chatgpt_plan_type ?? null;
  } catch {
    /* ignore */
  }

  const exp = getJwtExp(auth.tokens.access_token);
  const expiresAt = exp ? new Date(exp * 1000).toISOString() : null;

  return {
    connected: true,
    email,
    plan,
    expiresAt,
    lastRefresh: auth.last_refresh ?? null,
  };
}
