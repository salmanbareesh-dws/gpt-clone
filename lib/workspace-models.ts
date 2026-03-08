import { getSetting, setSetting, getJsonSetting, setJsonSetting } from "./app-settings";
import { getEnabledReadyProviders } from "./provider-connections";
import {
  DEFAULT_OPENAI_MODEL,
  dedupeStrings,
  getAllBuiltInModels,
  getProviderForModel,
  getProviderModels,
} from "./provider-models";

const AVAILABLE_MODELS_KEY = "available_models";
const DEFAULT_MODEL_KEY = "default_model";

async function getConfiguredModels(): Promise<string[]> {
  return getJsonSetting<string[]>(AVAILABLE_MODELS_KEY, getProviderModels("openai"));
}

export async function getAvailableModels(): Promise<string[]> {
  const [configured, enabledProviders] = await Promise.all([
    getConfiguredModels(),
    getEnabledReadyProviders(),
  ]);

  const allowedProviders = new Set(enabledProviders);
  allowedProviders.add("openai");

  const filtered = dedupeStrings(
    configured.filter((model) => allowedProviders.has(getProviderForModel(model))),
  );

  if (filtered.length > 0) {
    return filtered;
  }

  return dedupeStrings(
    getAllBuiltInModels().filter((model) => allowedProviders.has(getProviderForModel(model))),
  );
}

export async function setAvailableModels(models: string[]): Promise<void> {
  await setJsonSetting(AVAILABLE_MODELS_KEY, dedupeStrings(models));
}

export async function ensureProviderModels(providerId: "gemini" | "claude-code" | "qwen-code"): Promise<void> {
  const current = await getConfiguredModels();
  await setAvailableModels([...current, ...getProviderModels(providerId)]);
}

export async function getDefaultModel(): Promise<string> {
  const [storedDefault, models] = await Promise.all([
    getSetting(DEFAULT_MODEL_KEY),
    getAvailableModels(),
  ]);

  if (storedDefault && models.includes(storedDefault)) {
    return storedDefault;
  }

  return models[0] ?? DEFAULT_OPENAI_MODEL;
}

export async function setDefaultModel(model: string): Promise<void> {
  await setSetting(DEFAULT_MODEL_KEY, model);
}
