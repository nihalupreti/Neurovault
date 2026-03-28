import { log } from "./config.js";

export interface SyncChange {
  path: string;
  action: "upsert" | "delete";
  content?: string;
  clientHash: string;
}

export interface PushResponse {
  commitSha: string;
  conflicts?: {
    path: string;
    serverVersion: string;
    clientVersion: string;
    baseVersion: string;
  }[];
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

export class SyncClient {
  constructor(
    private serverUrl: string,
    private vaultId: string
  ) {}

  async push(changes: SyncChange[], baseCommit: string): Promise<PushResponse> {
    return this.post(`/api/sync/${this.vaultId}/push`, { changes, baseCommit });
  }

  async pull(since: string): Promise<PullResponse> {
    return this.get(`/api/sync/${this.vaultId}/pull?since=${since}`);
  }

  async getConflicts(): Promise<{ conflicts: { _id: string; filePath: string; resolution: string }[] }> {
    return this.get(`/api/sync/${this.vaultId}/conflicts`);
  }

  async resolveConflict(id: string, resolution: string, content?: string): Promise<{ commitSha: string }> {
    return this.post(`/api/sync/${this.vaultId}/conflicts/${id}/resolve`, { resolution, content });
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.serverUrl}${path}`);
    if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.serverUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path}: ${res.status} ${res.statusText}`);
    return res.json() as Promise<T>;
  }
}
