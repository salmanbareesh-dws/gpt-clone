export type ProviderId = "openai" | "gemini" | "claude-code" | "qwen-code";

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: "ChatGPT",
  gemini: "Gemini",
  "claude-code": "Claude Code",
  "qwen-code": "Qwen Code",
};

const BUILT_IN_MODELS: Record<ProviderId, string[]> = {
  openai: ["gpt-5-codex", "gpt-5"],
  gemini: ["gemini:gemini-2.5-pro", "gemini:gemini-2.5-flash"],
  "claude-code": ["claude-code:claude-sonnet-4-5", "claude-code:claude-opus-4-1"],
  "qwen-code": ["qwen-code:qwen3-coder-plus", "qwen-code:qwen3.5-plus"],
};

const MODEL_LABELS: Record<string, string> = {
  "gpt-5-codex": "ChatGPT",
  "gpt-5": "GPT-5",
  "gemini:gemini-2.5-pro": "Gemini 2.5 Pro",
  "gemini:gemini-2.5-flash": "Gemini 2.5 Flash",
  "claude-code:claude-sonnet-4-5": "Claude Sonnet 4.5",
  "claude-code:claude-opus-4-1": "Claude Opus 4.1",
  "qwen-code:qwen3-coder-plus": "Qwen3 Coder Plus",
  "qwen-code:qwen3.5-plus": "Qwen3.5 Plus",
};

export const DEFAULT_OPENAI_MODEL = "gpt-5-codex";

export function getProviderLabel(providerId: ProviderId): string {
  return PROVIDER_LABELS[providerId];
}

export function getProviderModels(providerId: ProviderId): string[] {
  return BUILT_IN_MODELS[providerId];
}

export function getAllBuiltInModels(): string[] {
  return dedupeStrings(Object.values(BUILT_IN_MODELS).flat());
}

export function getProviderForModel(model: string): ProviderId {
  if (model.startsWith("gemini:")) {
    return "gemini";
  }

  if (model.startsWith("claude-code:")) {
    return "claude-code";
  }

  if (model.startsWith("qwen-code:")) {
    return "qwen-code";
  }

  return "openai";
}

export function getProviderModelName(model: string): string {
  if (!model.includes(":")) {
    return model;
  }

  return model.slice(model.indexOf(":") + 1);
}

export function formatModelLabel(model: string): string {
  if (!model) {
    return "ChatGPT";
  }

  const explicit = MODEL_LABELS[model];
  if (explicit) {
    return explicit;
  }

  const providerId = getProviderForModel(model);
  if (providerId === "openai") {
    return model;
  }

  const providerLabel = getProviderLabel(providerId);
  const modelName = getProviderModelName(model);
  return `${providerLabel} · ${modelName}`;
}

export function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
