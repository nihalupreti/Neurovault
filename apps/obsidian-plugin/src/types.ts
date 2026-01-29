import type {
  SyncChange,
  PushResult as PushResponse,
  ConflictInfo,
  PullChange,
  PullResult as PullResponse,
  VaultInfo as VaultResponse,
  ConflictRecord,
  VaultStatus as StatusResponse,
} from "@neurovault/shared/types";

export type { SyncChange, PushResponse, ConflictInfo, PullChange, PullResponse, VaultResponse, ConflictRecord, StatusResponse };

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
