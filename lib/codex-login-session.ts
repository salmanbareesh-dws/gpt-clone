import { mkdir } from "fs/promises";
import { join } from "path";
import { spawn } from "child_process";
import { importFromCodexCliAt } from "@/lib/oauth";
import { prisma } from "@/lib/prisma";

export type CodexLoginState = {
  id: string;
  status: "starting" | "waiting" | "authorized" | "error";
  verificationUri: string | null;
  userCode: string | null;
  error: string | null;
  codexHome: string;
  startedAt: number;
  outputTail?: string;
};

const SESSION_PREFIX = "codex_login:";

async function saveSession(state: CodexLoginState): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key: `${SESSION_PREFIX}${state.id}` },
    update: { value: JSON.stringify(state) },
    create: { key: `${SESSION_PREFIX}${state.id}`, value: JSON.stringify(state) },
  });
}

function parseOutput(state: CodexLoginState, text: string) {
  const clean = text.replace(/\x1B\[[0-9;]*m/g, "");

  state.outputTail = `${state.outputTail ?? ""}${clean}`.slice(-4000);

  if (
    clean.includes(
      "Enable device code authorization for Codex in ChatGPT Security Settings",
    )
  ) {
    state.status = "error";
    state.error =
      "Device code auth is disabled for this account. In ChatGPT: Settings → Security → enable 'Device code authorization for Codex', then try login again.";
  }

  const urlMatch = clean.match(/https:\/\/auth\.openai\.com\/codex\/device\S*/i);
  if (urlMatch) {
    state.verificationUri = urlMatch[0];
    if (state.status === "starting") state.status = "waiting";
  }

  const codeMatch = clean.match(/\b[A-Z0-9]{4,5}-[A-Z0-9]{5}\b/);
  if (codeMatch) {
    state.userCode = codeMatch[0];
    if (state.status === "starting") state.status = "waiting";
  }

  void saveSession(state);
}

export async function startCodexLoginSession(): Promise<CodexLoginState> {
  const id = crypto.randomUUID();
  const codexHome = join(process.cwd(), ".codex");
  await mkdir(codexHome, { recursive: true });

  const state: CodexLoginState = {
    id,
    status: "starting",
    verificationUri: null,
    userCode: null,
    error: null,
    codexHome,
    startedAt: Date.now(),
    outputTail: "",
  };

  await saveSession(state);

  const command = process.platform === "win32" ? "cmd.exe" : "codex";
  const args =
    process.platform === "win32"
      ? ["/c", "codex", "login", "--device-auth", "-c", "cli_auth_credentials_store=\"file\""]
      : ["login", "--device-auth", "-c", 'cli_auth_credentials_store="file"'];

  const child = spawn(command, args, {
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    parseOutput(state, chunk.toString());
  });

  child.stderr.on("data", (chunk) => {
    parseOutput(state, chunk.toString());
  });

  child.on("error", (err) => {
    state.status = "error";
    state.error = err.message;
    void saveSession(state);
  });

  child.on("close", async (code) => {
    const imported = await importFromCodexCliAt(codexHome);
    if (imported.success) {
      state.status = "authorized";
      state.error = null;
      await saveSession(state);
      return;
    }

    if (state.status === "error" && state.error) {
      state.error = `${state.error} (exit code ${code ?? -1})`;
      await saveSession(state);
      return;
    }

    const output = state.outputTail ?? "";
    if (output.includes("Enable device code authorization for Codex")) {
      state.status = "error";
      state.error =
        "Device code auth is disabled for this account. In ChatGPT: Settings → Security → enable 'Device code authorization for Codex', then try again.";
    } else if (
      output.toLowerCase().includes("expired") ||
      output.toLowerCase().includes("one-time code")
    ) {
      state.status = "error";
      state.error = "The device code expired. Please click login again and complete it within 15 minutes.";
    } else if (
      output.toLowerCase().includes("cancel") ||
      output.toLowerCase().includes("aborted")
    ) {
      state.status = "error";
      state.error = "Login was cancelled before completion. Please try again.";
    } else {
      state.status = "error";
      state.error = `Codex login exited with code ${code ?? -1}. ${imported.error ?? "No tokens were created."}`;
    }

    await saveSession(state);
  });

  return state;
}

export function getCodexLoginSession(id: string): CodexLoginState | null {
  return null;
}

export async function getCodexLoginSessionById(
  id: string,
): Promise<CodexLoginState | null> {
  const row = await prisma.appSetting.findUnique({
    where: { key: `${SESSION_PREFIX}${id}` },
  });

  if (!row) return null;

  try {
    return JSON.parse(row.value) as CodexLoginState;
  } catch {
    return null;
  }
}
