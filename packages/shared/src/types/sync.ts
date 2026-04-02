export interface SyncChange {
  path: string;
  action: "upsert" | "delete";
  content?: string;
  clientHash: string;
}

export interface PushResult {
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

export interface PullResult {
  changes: PullChange[];
  currentCommit: string;
  hasMore: boolean;
}

export interface VaultInfo {
  _id: string;
  name: string;
  gitPath: string;
  syncConfig: SyncConfig;
  lastSyncedCommit: string;
}

export interface SyncConfig {
  include: string[];
  exclude: string[];
}

export interface ConflictRecord {
  _id: string;
  filePath: string;
  serverContent: string;
  clientContent: string;
  baseContent: string;
  resolution: ConflictResolution;
}

export type ConflictResolution = "client" | "server" | "manual_merge" | "pending";

export interface VaultStatus {
  vaultId: string;
  name: string;
  lastSyncedCommit: string;
  fileCount: number;
  pendingEmbeddings: number;
  failedEmbeddings: number;
  unresolvedConflicts: number;
}
