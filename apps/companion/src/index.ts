import fs from "fs";
import path from "path";
import { loadConfig, updateVaultCommit, log, type VaultConfig } from "./config.js";
import { SyncClient, type SyncChange } from "./sync-client.js";
import { WsListener } from "./ws-listener.js";
import { FileWatcher, type FileChange } from "./file-watcher.js";
import { LockDetector } from "./lock-detector.js";
import { ConflictWriter } from "./conflict-writer.js";
import { ChangeQueue } from "./queue.js";

class VaultSync {
  private client: SyncClient;
  private ws: WsListener;
  private watcher: FileWatcher;
  private lock: LockDetector;
  private conflicts: ConflictWriter;
  private queue: ChangeQueue;
  private pushing = false;

  constructor(private config: VaultConfig) {
    this.client = new SyncClient(config.serverUrl, config.vaultId);
    this.ws = new WsListener();
    this.watcher = new FileWatcher(config.path, config.include, config.exclude);
    this.lock = new LockDetector(config.path);
    this.conflicts = new ConflictWriter(config.path);
    this.queue = new ChangeQueue();
  }

  async start(): Promise<void> {
    log(`[${this.config.name}] Starting sync for ${this.config.path}`);

    this.lock.start((locked) => {
      if (locked) {
        log(`[${this.config.name}] Plugin active — pausing watcher`);
        this.watcher.pause();
        this.ws.disconnect();
      } else {
        log(`[${this.config.name}] Plugin inactive — resuming watcher`);
        this.watcher.resume();
        this.ws.connect(this.config.serverUrl, this.config.vaultId);
      }
    });

    if (this.lock.isLocked()) {
      log(`[${this.config.name}] Plugin active — standing by`);
      return;
    }

    if (this.config.baseCommit) {
      await this.pull();
    }

    this.watcher.start((changes) => this.handleLocalChanges(changes));

    this.ws.onChanges(() => this.pull());
    this.ws.connect(this.config.serverUrl, this.config.vaultId);

    log(`[${this.config.name}] Sync started`);
  }

  stop(): void {
    this.watcher.stop();
    this.ws.disconnect();
    this.lock.stop();
    log(`[${this.config.name}] Sync stopped`);
  }

  private async handleLocalChanges(changes: FileChange[]): Promise<void> {
    for (const change of changes) {
      if (change.action === "upsert") {
        const absPath = path.join(this.config.path, change.relativePath);
        try {
          const content = fs.readFileSync(absPath, "utf-8");
          this.queue.add(change.relativePath, "upsert", content);
        } catch {
          this.queue.add(change.relativePath, "delete");
        }
      } else {
        this.queue.add(change.relativePath, "delete");
      }
    }

    await this.push();
  }

  private async push(): Promise<void> {
    if (this.pushing || this.queue.isEmpty()) return;
    this.pushing = true;

    try {
      const items = this.queue.drain();
      const changes: SyncChange[] = items.map((item) => ({
        path: item.path,
        action: item.action,
        content: item.content,
        clientHash: item.hash,
      }));

      const result = await this.client.push(changes, this.config.baseCommit);

      if (result.conflicts && result.conflicts.length > 0) {
        for (const conflict of result.conflicts) {
          this.conflicts.writeConflict(conflict.path, conflict.serverVersion);
        }
      }

      this.config.baseCommit = result.commitSha;
      updateVaultCommit(this.config.vaultId, result.commitSha);
      log(`[${this.config.name}] Pushed ${changes.length} changes`);
    } catch (err) {
      log(`[${this.config.name}] Push failed: ${err}`);
    } finally {
      this.pushing = false;
    }
  }

  private async pull(): Promise<void> {
    if (!this.config.baseCommit) return;

    try {
      const result = await this.client.pull(this.config.baseCommit);

      for (const change of result.changes) {
        const absPath = path.join(this.config.path, change.path);

        if (change.action === "upsert" && change.content) {
          const content = Buffer.from(change.content, "base64").toString("utf-8");
          fs.mkdirSync(path.dirname(absPath), { recursive: true });
          fs.writeFileSync(absPath, content, "utf-8");
        } else if (change.action === "delete") {
          try {
            fs.unlinkSync(absPath);
          } catch {}
        }
      }

      this.config.baseCommit = result.currentCommit;
      updateVaultCommit(this.config.vaultId, result.currentCommit);

      if (result.changes.length > 0) {
        log(`[${this.config.name}] Pulled ${result.changes.length} changes`);
      }
    } catch (err) {
      log(`[${this.config.name}] Pull failed: ${err}`);
    }
  }
}

async function main(): Promise<void> {
  log("Neurovault companion service starting");

  const config = loadConfig();

  if (config.vaults.length === 0) {
    log("No vaults configured. Create ~/.neurovault/config.json");
    log('Example: { "vaults": [{ "name": "My Vault", "path": "/path/to/vault", "serverUrl": "http://localhost:3001", "vaultId": "...", "include": ["**/*.md"], "exclude": [".obsidian/**"], "baseCommit": "" }] }');
    return;
  }

  const syncs: VaultSync[] = [];

  for (const vault of config.vaults) {
    if (!fs.existsSync(vault.path)) {
      log(`Vault path not found: ${vault.path} — skipping`);
      continue;
    }

    const sync = new VaultSync(vault);
    await sync.start();
    syncs.push(sync);
  }

  process.on("SIGINT", () => {
    log("Shutting down...");
    for (const sync of syncs) sync.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    log("Shutting down...");
    for (const sync of syncs) sync.stop();
    process.exit(0);
  });

  log(`Watching ${syncs.length} vault(s)`);
}

main().catch((err) => {
  log(`Fatal error: ${err}`);
  process.exit(1);
});
