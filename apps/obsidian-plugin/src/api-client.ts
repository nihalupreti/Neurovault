import { requestUrl } from "obsidian";
import {
  SyncError,
  type SyncChange,
  type PushResponse,
  type PullResponse,
  type VaultResponse,
  type ConflictRecord,
  type StatusResponse,
} from "./types";

export class ApiClient {
  constructor(
    private serverUrl: string,
    private vaultId: string
  ) {}

  setVaultId(id: string): void {
    this.vaultId = id;
  }

  async registerVault(
    name: string,
    include: string[],
    exclude: string[]
  ): Promise<VaultResponse> {
    return this.post("/api/sync/vault", { name, include, exclude });
  }

  async push(
    changes: SyncChange[],
    baseCommit: string
  ): Promise<PushResponse> {
    return this.post(`/api/sync/${this.vaultId}/push`, {
      changes,
      baseCommit,
    });
  }

  async pull(since: string): Promise<PullResponse> {
    return this.get(`/api/sync/${this.vaultId}/pull?since=${since}`);
  }

  async getConflicts(): Promise<{ conflicts: ConflictRecord[] }> {
    return this.get(`/api/sync/${this.vaultId}/conflicts`);
  }

  async resolveConflict(
    id: string,
    resolution: string,
    content?: string
  ): Promise<{ success: boolean; commitSha: string }> {
    return this.post(`/api/sync/${this.vaultId}/conflicts/${id}/resolve`, {
      resolution,
      content,
    });
  }

  async getStatus(): Promise<StatusResponse> {
    return this.get(`/api/sync/${this.vaultId}/status`);
  }

  private async get<T>(path: string): Promise<T> {
    try {
      const response = await requestUrl({
        url: `${this.serverUrl}${path}`,
        method: "GET",
      });
      return response.json as T;
    } catch (err: any) {
      throw this.toSyncError(err);
    }
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    try {
      const response = await requestUrl({
        url: `${this.serverUrl}${path}`,
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return response.json as T;
    } catch (err: any) {
      throw this.toSyncError(err);
    }
  }

  private toSyncError(err: any): SyncError {
    const status = err.status || 0;
    const message = err.message || "Network error";
    const retryable = status === 0 || status >= 500;
    return new SyncError(message, status, retryable);
  }
}
