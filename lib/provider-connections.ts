import { access, mkdir, readFile } from "fs/promises";
import { constants as fsConstants } from "fs";
import { execFile, spawn } from "child_process";
import { homedir } from "os";
import { dirname, join } from "path";
import { promisify } from "util";
import { getOAuthStatus } from "./oauth";
import { getJsonSetting, setJsonSetting } from "./app-settings";
import {
  type ProviderId,
  dedupeStrings,
  getProviderLabel,
  getProviderModels,
} from "./provider-models";

const execFileAsync = promisify(execFile);
const ENABLED_PROVIDER_KEY = "enabled_cli_providers";
const ANSI_PATTERN = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export type ProviderStatus = {
  id: ProviderId;
  label: string;
  connected: boolean;
  enabled: boolean;
  installed: boolean;
  email: string | null;
  plan: string | null;
  expiresAt: string | null;
  command: string | null;
  note: string | null;
  models: string[];
};

type CommandSpec = {
  command: string;
  prefixArgs: string[];
  displayCommand: string;
};

type CliExecutionOptions = {
  providerId: Exclude<ProviderId, "openai">;
  model: string;
  prompt: string;
  onChunk: (text: string) => void;
};

function cleanAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, "");
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const millis = value > 10_000_000_000 ? value : value * 1000;
    return new Date(millis).toISOString();
  }

  if (typeof value === "string" && value.trim()) {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return normalizeTimestamp(numeric);
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }

  return null;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function resolveOnPath(name: string): Promise<string | null> {
  try {
    const locator = process.platform === "win32" ? "where.exe" : "which";
    const { stdout } = await execFileAsync(locator, [name], {
      windowsHide: true,
      timeout: 10_000,
    });

    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find(Boolean) ?? null;
  } catch {
    return null;
  }
}

async function resolveGeminiCommand(): Promise<CommandSpec | null> {
  if (process.platform === "win32") {
    const wrapper = (await resolveOnPath("gemini.cmd")) ?? (await resolveOnPath("gemini"));
    if (wrapper) {
      const script = join(dirname(wrapper), "node_modules", "@google", "gemini-cli", "dist", "index.js");
      if (await pathExists(script)) {
        return {
          command: process.execPath,
          prefixArgs: [script],
          displayCommand: wrapper,
        };
      }
    }
  }

  const direct = await resolveOnPath("gemini");
  if (!direct) {
    return null;
  }

  return {
    command: direct,
    prefixArgs: [],
    displayCommand: direct,
  };
}

async function resolveClaudeCommand(): Promise<CommandSpec | null> {
  const candidates =
    process.platform === "win32"
      ? ["claude.exe", "claude.cmd", "claude"]
      : ["claude"];

  for (const candidate of candidates) {
    const resolved = await resolveOnPath(candidate);
    if (resolved) {
      return {
        command: resolved,
        prefixArgs: [],
        displayCommand: resolved,
      };
    }
  }

  return null;
}

async function resolveQwenCommand(): Promise<CommandSpec | null> {
  const localScript = join(process.cwd(), "node_modules", "@qwen-code", "qwen-code", "cli.js");
  if (await pathExists(localScript)) {
    return {
      command: process.execPath,
      prefixArgs: [localScript],
      displayCommand: localScript,
    };
  }

  if (process.platform === "win32") {
    const wrapper = (await resolveOnPath("qwen.cmd")) ?? (await resolveOnPath("qwen"));
    if (wrapper) {
      const script = join(dirname(wrapper), "node_modules", "@qwen-code", "qwen-code", "cli.js");
      if (await pathExists(script)) {
        return {
          command: process.execPath,
          prefixArgs: [script],
          displayCommand: wrapper,
        };
      }
    }
  }

  const direct = await resolveOnPath("qwen");
  if (!direct) {
    return null;
  }

  return {
    command: direct,
    prefixArgs: [],
    displayCommand: direct,
  };
}

async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function getEnabledProviders(): Promise<ProviderId[]> {
  return getJsonSetting<ProviderId[]>(ENABLED_PROVIDER_KEY, []);
}

export async function enableProvider(providerId: Exclude<ProviderId, "openai">): Promise<void> {
  const current = await getEnabledProviders();
  await setJsonSetting(ENABLED_PROVIDER_KEY, dedupeStrings([...current, providerId]));
}

export async function disableProvider(providerId: Exclude<ProviderId, "openai">): Promise<void> {
  const current = await getEnabledProviders();
  await setJsonSetting(
    ENABLED_PROVIDER_KEY,
    current.filter((value) => value !== providerId),
  );
}

async function getOpenAiProviderStatus(): Promise<ProviderStatus> {
  const status = await getOAuthStatus();
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const connected = status.connected || hasApiKey;

  return {
    id: "openai",
    label: getProviderLabel("openai"),
    connected,
    enabled: connected,
    installed: connected,
    email: status.email,
    plan: status.plan ?? (hasApiKey ? "API key" : null),
    expiresAt: status.expiresAt,
    command: null,
    note: status.connected
      ? "Connected through ChatGPT OAuth."
      : hasApiKey
        ? "Connected through OPENAI_API_KEY."
        : "Use the existing ChatGPT OAuth flow in the admin panel.",
    models: getProviderModels("openai"),
  };
}

async function getGeminiProviderStatus(enabled: boolean): Promise<ProviderStatus> {
  const command = await resolveGeminiCommand();
  const oauthPath = join(homedir(), ".gemini", "oauth_creds.json");
  const accountsPath = join(homedir(), ".gemini", "google_accounts.json");
  const creds = await readJsonFile<{
    expiry_date?: number | string;
  }>(oauthPath);
  const accounts = await readJsonFile<{
    active?: string;
  }>(accountsPath);

  const connected = Boolean(command && creds);

  return {
    id: "gemini",
    label: getProviderLabel("gemini"),
    connected,
    enabled,
    installed: Boolean(command),
    email: accounts?.active ?? null,
    plan: null,
    expiresAt: normalizeTimestamp(creds?.expiry_date),
    command: command?.displayCommand ?? null,
    note: connected
      ? "Uses the local Gemini CLI OAuth session."
      : command
        ? "Run `gemini` once and sign in with Google, then connect it here."
        : "Gemini CLI was not found on this machine.",
    models: getProviderModels("gemini"),
  };
}

async function getClaudeProviderStatus(enabled: boolean): Promise<ProviderStatus> {
  const command = await resolveClaudeCommand();
  const credentialsPath = join(homedir(), ".claude", ".credentials.json");
  const creds = await readJsonFile<{
    claudeAiOauth?: {
      expiresAt?: string | number;
      rateLimitTier?: string;
      subscriptionType?: string;
    };
  }>(credentialsPath);

  const oauth = creds?.claudeAiOauth;
  const connected = Boolean(command && oauth);
  const plan = oauth?.subscriptionType ?? oauth?.rateLimitTier ?? null;

  return {
    id: "claude-code",
    label: getProviderLabel("claude-code"),
    connected,
    enabled,
    installed: Boolean(command),
    email: null,
    plan,
    expiresAt: normalizeTimestamp(oauth?.expiresAt),
    command: command?.displayCommand ?? null,
    note: connected
      ? "Uses the local Claude Code login."
      : command
        ? "Run `claude auth login` once, then connect it here."
        : "Claude Code was not found on this machine.",
    models: getProviderModels("claude-code"),
  };
}

async function getQwenProviderStatus(enabled: boolean): Promise<ProviderStatus> {
  const command = await resolveQwenCommand();
  const qwenHome = join(homedir(), ".qwen");
  const connected = Boolean(command && (await pathExists(qwenHome)));

  return {
    id: "qwen-code",
    label: getProviderLabel("qwen-code"),
    connected,
    enabled,
    installed: Boolean(command),
    email: null,
    plan: null,
    expiresAt: null,
    command: command?.displayCommand ?? null,
    note: connected
      ? "Uses the local Qwen Code OAuth cache."
      : command
        ? "Run `qwen`, then `/auth`, choose Qwen OAuth, and reconnect it here."
        : "Qwen Code was not found on this machine.",
    models: getProviderModels("qwen-code"),
  };
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const enabledProviders = new Set(await getEnabledProviders());

  const [openai, gemini, claude, qwen] = await Promise.all([
    getOpenAiProviderStatus(),
    getGeminiProviderStatus(enabledProviders.has("gemini")),
    getClaudeProviderStatus(enabledProviders.has("claude-code")),
    getQwenProviderStatus(enabledProviders.has("qwen-code")),
  ]);

  return [openai, gemini, claude, qwen];
}

export async function getEnabledReadyProviders(): Promise<ProviderId[]> {
  const statuses = await getProviderStatuses();
  const ready = statuses
    .filter((status) => {
      if (status.id === "openai") {
        return true;
      }

      return status.enabled && status.connected;
    })
    .map((status) => status.id);

  return ready.length > 0 ? ready : ["openai"];
}

async function getCommandSpec(providerId: Exclude<ProviderId, "openai">): Promise<CommandSpec | null> {
  if (providerId === "gemini") {
    return resolveGeminiCommand();
  }

  if (providerId === "claude-code") {
    return resolveClaudeCommand();
  }

  return resolveQwenCommand();
}

function getCliArgs(
  providerId: Exclude<ProviderId, "openai">,
  model: string,
  prompt: string,
): string[] {
  if (providerId === "gemini") {
    return [
      "-p",
      prompt,
      "--approval-mode",
      "plan",
      "--output-format",
      "text",
      "-m",
      model,
    ];
  }

  if (providerId === "claude-code") {
    return [
      "-p",
      prompt,
      "--permission-mode",
      "plan",
      "--tools",
      "",
      "--output-format",
      "text",
      "--model",
      model,
    ];
  }

  return [
    "-p",
    prompt,
    "--approval-mode",
    "plan",
    "--auth-type",
    "qwen-oauth",
    "--output-format",
    "text",
    "-m",
    model,
  ];
}

function getFriendlyConnectionError(providerId: Exclude<ProviderId, "openai">): string {
  if (providerId === "gemini") {
    return "Gemini is not connected. Run `gemini` once, sign in with Google, then enable Gemini in the admin panel.";
  }

  if (providerId === "claude-code") {
    return "Claude Code is not connected. Run `claude auth login` once, then enable Claude Code in the admin panel.";
  }

  return "Qwen Code is not connected. Run `qwen`, then `/auth`, choose Qwen OAuth, and enable Qwen Code in the admin panel.";
}

export async function assertProviderCanConnect(
  providerId: Exclude<ProviderId, "openai">,
): Promise<ProviderStatus> {
  const status = (await getProviderStatuses()).find((value) => value.id === providerId);
  if (!status) {
    throw new Error("Unknown provider");
  }

  if (!status.installed) {
    throw new Error(status.note ?? "Provider CLI is not installed.");
  }

  if (!status.connected) {
    throw new Error(status.note ?? "Provider is not authenticated.");
  }

  return status;
}

export async function streamCliProviderResponse({
  providerId,
  model,
  prompt,
  onChunk,
}: CliExecutionOptions): Promise<string> {
  const status = (await getProviderStatuses()).find((value) => value.id === providerId);

  if (!status?.connected || !status.enabled) {
    throw new Error(getFriendlyConnectionError(providerId));
  }

  const commandSpec = await getCommandSpec(providerId);
  if (!commandSpec) {
    throw new Error(getFriendlyConnectionError(providerId));
  }

  const runtimeDir = join(process.cwd(), "output", "provider-runtime", providerId);
  await mkdir(runtimeDir, { recursive: true });

  const args = [...commandSpec.prefixArgs, ...getCliArgs(providerId, model, prompt)];

  return new Promise<string>((resolve, reject) => {
    const child = spawn(commandSpec.command, args, {
      cwd: runtimeDir,
      env: {
        ...process.env,
        FORCE_COLOR: "0",
        NO_COLOR: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    let fullOutput = "";
    let errorOutput = "";

    child.stdout.on("data", (chunk) => {
      const text = cleanAnsi(chunk.toString());
      if (!text) {
        return;
      }

      fullOutput += text;
      onChunk(text);
    });

    child.stderr.on("data", (chunk) => {
      errorOutput += cleanAnsi(chunk.toString());
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const content = fullOutput.trim();

      if (code === 0 && content) {
        resolve(content);
        return;
      }

      reject(
        new Error(
          errorOutput.trim() ||
            content ||
            `The ${status.label} CLI exited with code ${code ?? -1}.`,
        ),
      );
    });
  });
}
