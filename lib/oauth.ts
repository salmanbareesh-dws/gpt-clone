/**
 * OAuth Device Code flow for ChatGPT / OpenAI.
 *
 * Tokens are stored in the AppSetting table so they survive restarts
 * and work across multiple server instances.
 *
 * Connection methods:
 *   1. Import from Codex CLI (~/.codex/auth.json)
 *   2. Browser-side device code flow (client calls OpenAI directly, sends tokens to our API)
 *   3. Auto-refresh when tokens expire
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { deleteSetting, getSetting, setSetting } from "./app-settings";

/* ── OpenAI Auth Constants ── */

export const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"; // Codex CLI public client
export const AUTH_BASE = "https://auth.openai.com";
export const DEVICE_CODE_URL = `${AUTH_BASE}/oauth/device/code`;
export const TOKEN_URL = `${AUTH_BASE}/oauth/token`;
export const AUDIENCE = "https://api.openai.com/v1";

// Request scopes that include Responses API write access
export const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "model.request",
  "model.read",
  "api.responses.read",
  "api.responses.write",
].join(" ");

/* ── Types ── */

export interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  account_id?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

interface StoredTokens {
  access_token: string;
  refresh_token: string;
  id_token: string;
  account_id: string | null;
  expires_at: number; // unix timestamp
}

interface CodexCliAuthFile {
  tokens?: {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    account_id?: string;
  } | null;
}

/* ── In-memory cache ── */

let cachedTokens: StoredTokens | null = null;
let cacheTime = 0;
const CACHE_TTL = 15_000; // 15 seconds

/* ── Token Storage (DB) ── */

/** Save OAuth tokens to DB. */
export async function saveTokens(tokens: OAuthTokens): Promise<void> {
  const accountId =
    tokens.account_id ??
    getChatGptAccountIdFromJwt(tokens.access_token) ??
    getChatGptAccountIdFromJwt(tokens.id_token);

  const stored: StoredTokens = {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    id_token: tokens.id_token,
    account_id: accountId ?? null,
    expires_at: tokens.expires_in
      ? Math.floor(Date.now() / 1000) + tokens.expires_in
      : getJwtExp(tokens.access_token) ?? Math.floor(Date.now() / 1000) + 3600,
  };
  await setSetting("oauth_tokens", JSON.stringify(stored));
  cachedTokens = stored;
  cacheTime = Date.now();
}

/** Load tokens from DB (with in-memory cache). */
async function loadTokens(): Promise<StoredTokens | null> {
  const now = Date.now();
  if (cachedTokens && now - cacheTime < CACHE_TTL) {
    return cachedTokens;
  }

  const raw = await getSetting("oauth_tokens");
  if (!raw) {
    cachedTokens = null;
    return null;
  }

  try {
    cachedTokens = JSON.parse(raw) as StoredTokens;
    cacheTime = now;
    return cachedTokens;
  } catch {
    cachedTokens = null;
    return null;
  }
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

function getChatGptAccountIdFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );
    return payload["https://api.openai.com/auth"]?.chatgpt_account_id ?? null;
  } catch {
    return null;
  }
}

/** Refresh the access token using the stored refresh token. */
async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "codex-chatgpt-clone/1.0",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      console.error(`[oauth] Refresh failed: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = (await res.json()) as OAuthTokens;

    // Update stored tokens
    const stored: StoredTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken,
      id_token: data.id_token || cachedTokens?.id_token || "",
      account_id:
        cachedTokens?.account_id ??
        getChatGptAccountIdFromJwt(data.access_token) ??
        null,
      expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
    };

    await setSetting("oauth_tokens", JSON.stringify(stored));
    cachedTokens = stored;
    cacheTime = Date.now();

    return data.access_token;
  } catch (err) {
    console.error("[oauth] Refresh error:", err);
    return null;
  }
}

/**
 * Get a valid access token. Auto-refreshes if expired.
 * Returns null if not connected.
 */
export async function getAccessToken(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens?.access_token) return null;

  const now = Math.floor(Date.now() / 1000);

  // Refresh if token expires in < 5 minutes
  if (tokens.expires_at && tokens.expires_at - now < 300) {
    console.log("[oauth] Token expiring soon, refreshing...");
    return refreshAccessToken(tokens.refresh_token);
  }

  return tokens.access_token;
}

/**
 * Extract the ChatGPT Account ID from the stored access token JWT.
 * This is required for the chatgpt.com backend API.
 */
export async function getChatGptAccountId(): Promise<string | null> {
  const tokens = await loadTokens();
  if (!tokens?.access_token) return null;

  if (tokens.account_id) {
    return tokens.account_id;
  }

  try {
    return getChatGptAccountIdFromJwt(tokens.access_token);
  } catch {
    return null;
  }
}

/**
 * Get OAuth status for admin dashboard.
 */
export async function getOAuthStatus(): Promise<{
  connected: boolean;
  email: string | null;
  plan: string | null;
  expiresAt: string | null;
}> {
  const tokens = await loadTokens();

  if (!tokens?.access_token) {
    return { connected: false, email: null, plan: null, expiresAt: null };
  }

  // Decode id_token for user info
  let email: string | null = null;
  let plan: string | null = null;

  try {
    const parts = tokens.id_token.split(".");
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8"),
    );
    email = payload.email ?? null;
    plan = payload["https://api.openai.com/auth"]?.chatgpt_plan_type ?? null;
  } catch {
    /* ignore */
  }

  const expiresAt = tokens.expires_at
    ? new Date(tokens.expires_at * 1000).toISOString()
    : null;

  return { connected: true, email, plan, expiresAt };
}

/** Disconnect: remove stored tokens. */
export async function disconnectOAuth(): Promise<void> {
  await deleteSetting("oauth_tokens");
  cachedTokens = null;
}

/**
 * Import tokens from the Codex CLI's auth.json file.
 * Returns true if successful.
 */
export async function importFromCodexCli(): Promise<{
  success: boolean;
  error?: string;
}> {
  return importFromCodexCliAt();
}

export async function importFromCodexCliAt(codexHome?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const candidates = [
      codexHome,
      process.env.CODEX_HOME,
      join(process.cwd(), ".codex"),
      join(homedir(), ".codex"),
    ].filter((value): value is string => Boolean(value));

    let auth: CodexCliAuthFile | null = null;

    for (const home of candidates) {
      try {
        const authPath = join(home, "auth.json");
        const raw = await readFile(authPath, "utf-8");
        auth = JSON.parse(raw) as CodexCliAuthFile;
        if (auth?.tokens?.access_token && auth?.tokens?.refresh_token) {
          break;
        }
      } catch {
        /* try next path */
      }
    }

    if (!auth?.tokens?.access_token || !auth?.tokens?.refresh_token) {
      return { success: false, error: "No valid tokens found in Codex CLI config" };
    }

    await saveTokens({
      access_token: auth.tokens.access_token,
      refresh_token: auth.tokens.refresh_token,
      id_token: auth.tokens.id_token || "",
      account_id: auth.tokens.account_id,
    });

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to read Codex CLI tokens",
    };
  }
}

/* ── Model Settings ── */

