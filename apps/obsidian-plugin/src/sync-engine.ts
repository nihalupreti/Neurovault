import type { Vault } from "obsidian";
import { ApiClient } from "./api-client";
import { LocalQueue } from "./local-queue";
import { VaultWatcher, type WatcherChange } from "./vault-watcher";
import { toBase64, sha256, fromBase64 } from "./utils";
import type {
  SyncChange,
  SyncState,
  NeurovaultSettings,
  ConflictInfo,
} from "./types";

export class SyncEngine {
  private state: SyncState = "idle";
  private pendingChanges = new Map<string, "upsert" | "delete">();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private onStateChange: ((state: SyncState) => void) | null = null;
  private onConflict: ((conflicts: ConflictInfo[]) => void) | null = null;

  constructor(
    private vault: Vault,
    private api: ApiClient,
    private queue: LocalQueue,
    private settings: NeurovaultSettings
  ) {}

  setOnStateChange(cb: (state: SyncState) => void): void {
    this.onStateChange = cb;
  }

  setOnConflict(cb: (conflicts: ConflictInfo[]) => void): void {
    this.onConflict = cb;
  }

  getState(): SyncState {
    return this.state;
  }

  handleLocalChange(change: WatcherChange): void {
    this.pendingChanges.set(change.path, change.action);

    if (this.state === "pulling") {
      this.setState("push_first");
      return;
    }

    if (this.state === "idle" || this.state === "debouncing") {
      this.setState("debouncing");
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.executePush();
      }, this.settings.debounceMs);
    }
  }

  async handleRemoteChange(): Promise<void> {
    if (this.state === "debouncing" || this.state === "pushing") {
      return;
    }

    if (this.pendingChanges.size > 0) {
      this.setState("push_first");
      this.executePush();
      return;
    }

    await this.executePull();
  }

  async startupSync(): Promise<void> {
    if (!this.settings.baseCommit) return;
    await this.executePull();
  }

  async drainQueue(
    watcher: VaultWatcher,
    readFile: (path: string) => Promise<string | null>
  ): Promise<void> {
    if (this.queue.isEmpty()) return;

    await this.queue.refreshContent(readFile);
    const changes = this.queue.toSyncChanges();

    try {
      const result = await this.api.push(changes, this.settings.baseCommit);
      if (result.conflicts && result.conflicts.length > 0) {
        this.onConflict?.(result.conflicts);
      }
      this.settings.baseCommit = result.commitSha;
      this.queue.clear();
    } catch {
      // keep queue, will retry on next sync
    }
  }

  flushPending(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.pendingChanges.size > 0) {
      this.executePush();
    }
  }

  private async executePush(): Promise<void> {
    this.setState("pushing");

    const changes: SyncChange[] = [];
    for (const [path, action] of this.pendingChanges) {
      if (action === "delete") {
        changes.push({ path, action, clientHash: "" });
      } else {
        try {
          const content = await this.vault.adapter.read(path);
          const hash = await sha256(content);
          changes.push({
            path,
            action,
            content: toBase64(content),
            clientHash: hash,
          });
        } catch {
          changes.push({ path, action: "delete", clientHash: "" });
        }
      }
    }

    this.pendingChanges.clear();

    try {
      const result = await this.api.push(changes, this.settings.baseCommit);

      if (result.conflicts && result.conflicts.length > 0) {
        this.setState("resolving");
        this.onConflict?.(result.conflicts);
      }

      this.settings.baseCommit = result.commitSha;
      this.setState("idle");
    } catch (err: any) {
      if (err.retryable) {
        for (const change of changes) {
          await this.queue.add(
            change.path,
            change.action,
            change.content ? fromBase64(change.content) : undefined
          );
        }
      }
      this.setState("idle");
    }
  }

  async executePull(watcher?: VaultWatcher): Promise<void> {
    if (!this.settings.baseCommit) return;

    this.setState("pulling");

    try {
      const result = await this.api.pull(this.settings.baseCommit);

      for (const change of result.changes) {
        if (change.action === "upsert" && change.content) {
          const content = fromBase64(change.content);
          watcher?.lockPath(change.path);
          const dir = change.path.substring(0, change.path.lastIndexOf("/"));
          if (dir) {
            try {
              await this.vault.adapter.mkdir(dir);
            } catch {
              // dir exists
            }
          }
          await this.vault.adapter.write(change.path, content);
        } else if (change.action === "delete") {
          watcher?.lockPath(change.path);
          try {
            await this.vault.adapter.remove(change.path);
          } catch {
            // file already gone
          }
        }
      }

      this.settings.baseCommit = result.currentCommit;

      if (this.state === "push_first") {
        this.setState("debouncing");
        this.debounceTimer = setTimeout(() => {
          this.executePush();
        }, this.settings.debounceMs);
      } else {
        this.setState("idle");
      }
    } catch {
      this.setState("idle");
    }
  }

  onConflictResolved(commitSha: string): void {
    this.settings.baseCommit = commitSha;
    if (this.pendingChanges.size > 0) {
      this.executePush();
    } else {
      this.setState("idle");
    }
  }

  private setState(state: SyncState): void {
    this.state = state;
    this.onStateChange?.(state);
  }
}
