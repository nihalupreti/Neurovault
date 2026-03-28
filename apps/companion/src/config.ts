import fs from "fs";
import path from "path";
import os from "os";

export interface VaultConfig {
  name: string;
  path: string;
  serverUrl: string;
  vaultId: string;
  include: string[];
  exclude: string[];
  baseCommit: string;
}

export interface CompanionConfig {
  vaults: VaultConfig[];
}

const CONFIG_DIR = path.join(os.homedir(), ".neurovault");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const LOG_PATH = path.join(CONFIG_DIR, "sync.log");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getLogPath(): string {
  return LOG_PATH;
}

export function loadConfig(): CompanionConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as CompanionConfig;
  } catch {
    return { vaults: [] };
  }
}

export function saveConfig(config: CompanionConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}

export function updateVaultCommit(vaultId: string, commit: string): void {
  const config = loadConfig();
  const vault = config.vaults.find((v) => v.vaultId === vaultId);
  if (vault) {
    vault.baseCommit = commit;
    saveConfig(config);
  }
}

export function log(message: string): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.appendFileSync(LOG_PATH, line, "utf-8");
  console.log(line.trim());
}
