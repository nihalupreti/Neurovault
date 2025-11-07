export interface SyncChange {
  path: string;
  action: "upsert" | "delete";
  content?: string;
  clientHash: string;
}

export interface PushResponse {
  commitSha: string;
  conflicts?: ConflictInfo[];
}

export interface ConflictInfo {
  path: string;
  serverVersion: string;
  clientVersion: string;
  baseVersion: string;
}

export interface PullChange {
  path: string;
  action: "upsert" | "delete";
  content?: string;
  contentHash: string;
}

export interface PullResponse {
  changes: PullChange[];
  currentCommit: string;
  hasMore: boolean;
}

export interface VaultResponse {
  _id: string;
  name: string;
  gitPath: string;
  syncConfig: {
    include: string[];
    exclude: string[];
  };
  lastSyncedCommit: string;
}

export interface ConflictRecord {
  _id: string;
  filePath: string;
  serverContent: string;
  clientContent: string;
  baseContent: string;
  resolution: string;
}

export interface StatusResponse {
  vaultId: string;
  name: string;
  lastSyncedCommit: string;
  fileCount: number;
  pendingEmbeddings: number;
  failedEmbeddings: number;
  unresolvedConflicts: number;
}

export interface QueuedChange {
  path: string;
  action: "upsert" | "delete";
  content?: string;
  hash: string;
  queuedAt: number;
}

export class SyncError extends Error {
  constructor(
    message: string,
    public status: number,
    public retryable: boolean
  ) {
    super(message);
    this.name = "SyncError";
  }
}

export type SyncState =
  | "idle"
  | "debouncing"
  | "pushing"
  | "pulling"
  | "resolving"
  | "push_first";

export interface NeurovaultSettings {
  serverUrl: string;
  vaultId: string;
  vaultName: string;
  baseCommit: string;
  include: string[];
  exclude: string[];
  syncIntervalMs: number;
  debounceMs: number;
  autoSync: boolean;
}

export const DEFAULT_SETTINGS: NeurovaultSettings = {
  serverUrl: "http://localhost:3001",
  vaultId: "",
  vaultName: "",
  baseCommit: "",
  include: ["**/*.md"],
  exclude: [".obsidian/**"],
  syncIntervalMs: 30000,
  debounceMs: 500,
  autoSync: true,
};
