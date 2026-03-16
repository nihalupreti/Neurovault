import { Plugin, Notice } from "obsidian";
import { ApiClient } from "./api-client";
import { WsClient } from "./ws-client";
import { SyncEngine } from "./sync-engine";
import { VaultWatcher } from "./vault-watcher";
import { LocalQueue } from "./local-queue";
import { ConflictModal } from "./conflict-modal";
import { NeurovaultSettingTab } from "./settings";
import {
  DEFAULT_SETTINGS,
  type NeurovaultSettings,
  type ConflictInfo,
  type QueuedChange,
} from "./types";

interface PluginData {
  settings: NeurovaultSettings;
  queue: QueuedChange[];
}

const LOCK_FILE = ".neurovault-plugin-active";

export default class NeurovaultPlugin extends Plugin {
  settings: NeurovaultSettings = { ...DEFAULT_SETTINGS };
  private api!: ApiClient;
  private ws!: WsClient;
  private engine!: SyncEngine;
  private watcher!: VaultWatcher;
  private queue!: LocalQueue;
  private statusBarEl: HTMLElement | null = null;
  private conflictQueue: ConflictInfo[] = [];

  async onload(): Promise<void> {
    await this.loadSettings();
    this.addSettingTab(new NeurovaultSettingTab(this.app, this));

    if (!this.settings.vaultId) {
      new Notice("Neurovault: Configure sync in settings");
      return;
    }

    this.api = new ApiClient(this.settings.serverUrl, this.settings.vaultId);
    this.ws = new WsClient();
    this.queue = new LocalQueue();
    this.engine = new SyncEngine(
      this.app.vault,
      this.api,
      this.queue,
      this.settings
    );
    this.watcher = new VaultWatcher(
      this.app.vault,
      this.settings.include,
      this.settings.exclude
    );

    const data = await this.loadData() as PluginData | null;
    if (data?.queue) {
      this.queue.load(data.queue);
    }

    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar("idle");

    this.engine.setOnStateChange((state) => this.updateStatusBar(state));
    this.engine.setOnConflict((conflicts) => this.handleConflicts(conflicts));

    await this.engine.drainQueue(this.watcher, async (path) => {
      try {
        return await this.app.vault.adapter.read(path);
      } catch {
        return null;
      }
    });

    await this.engine.startupSync();

    if (this.settings.autoSync) {
      this.watcher.start((change) => this.engine.handleLocalChange(change));
    }

    this.ws.onChangesAvailable(() => this.engine.handleRemoteChange());
    this.ws.setPollFallback(() => this.engine.handleRemoteChange());
    this.ws.connect(this.settings.serverUrl, this.settings.vaultId);

    try {
      await this.app.vault.adapter.write(LOCK_FILE, String(Date.now()));
    } catch {
      // non-critical
    }

    this.addCommand({
      id: "force-sync",
      name: "Force sync now",
      callback: () => {
        this.engine.flushPending();
        this.engine.handleRemoteChange();
      },
    });

    this.addCommand({
      id: "view-status",
      name: "View sync status",
      callback: async () => {
        try {
          const status = await this.api.getStatus();
          new Notice(
            `Files: ${status.fileCount} | Pending: ${status.pendingEmbeddings} | Conflicts: ${status.unresolvedConflicts}`
          );
        } catch (err: any) {
          new Notice(`Status check failed: ${err.message}`);
        }
      },
    });

    this.addCommand({
      id: "view-conflicts",
      name: "View conflicts",
      callback: async () => {
        try {
          const { conflicts } = await this.api.getConflicts();
          if (conflicts.length === 0) {
            new Notice("No unresolved conflicts");
          } else {
            new Notice(`${conflicts.length} unresolved conflict(s)`);
          }
        } catch (err: any) {
          new Notice(`Failed: ${err.message}`);
        }
      },
    });
  }

  async onunload(): Promise<void> {
    this.watcher?.stop();
    this.ws?.disconnect();
    this.engine?.flushPending();

    await this.saveSettings();

    try {
      await this.app.vault.adapter.remove(LOCK_FILE);
    } catch {
      // non-critical
    }
  }

  async loadSettings(): Promise<void> {
    const data = (await this.loadData()) as PluginData | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, data?.settings);
  }

  async saveSettings(): Promise<void> {
    const data: PluginData = {
      settings: this.settings,
      queue: this.queue?.getAll() ?? [],
    };
    await this.saveData(data);
  }

  private updateStatusBar(state: string): void {
    if (!this.statusBarEl) return;
    const labels: Record<string, string> = {
      idle: "✓ synced",
      debouncing: "↑ syncing",
      pushing: "↑ syncing",
      pulling: "↓ pulling",
      resolving: "⚡ conflict",
      push_first: "↑ syncing",
    };
    this.statusBarEl.setText(labels[state] ?? "✕ offline");
  }

  private handleConflicts(conflicts: ConflictInfo[]): void {
    this.conflictQueue.push(...conflicts);
    this.showNextConflict();
  }

  private showNextConflict(): void {
    if (this.conflictQueue.length === 0) return;
    const conflict = this.conflictQueue.shift()!;

    new ConflictModal(
      this.app,
      conflict,
      this.api,
      (commitSha) => this.engine.onConflictResolved(commitSha),
      () => this.showNextConflict()
    ).open();
  }
}
