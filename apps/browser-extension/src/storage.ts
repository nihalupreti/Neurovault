import { ExtensionConfig } from "./types.js";

const api = typeof browser !== "undefined" ? browser : chrome;

const STORAGE_KEY = "neurovault_config";

export async function getConfig(): Promise<ExtensionConfig | null> {
  const result = await api.storage.sync.get(STORAGE_KEY);
  const config = result[STORAGE_KEY] as ExtensionConfig | undefined;
  if (!config || !config.apiUrl || !config.secret) {
    return null;
  }
  return config;
}

export async function saveConfig(config: ExtensionConfig): Promise<void> {
  await api.storage.sync.set({ [STORAGE_KEY]: config });
}
