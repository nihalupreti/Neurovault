import { type Vault, TFile, type EventRef } from "obsidian";
import { matchesGlobs } from "./utils";

export interface WatcherChange {
  path: string;
  action: "upsert" | "delete";
}

export class VaultWatcher {
  private refs: EventRef[] = [];
  private writeLock = new Set<string>();
  private onChange: ((change: WatcherChange) => void) | null = null;

  constructor(
    private vault: Vault,
    private include: string[],
    private exclude: string[]
  ) {}

  start(onChange: (change: WatcherChange) => void): void {
    this.onChange = onChange;

    this.refs.push(
      this.vault.on("create", (file) => {
        if (file instanceof TFile) this.emit(file.path, "upsert");
      })
    );

    this.refs.push(
      this.vault.on("modify", (file) => {
        if (file instanceof TFile) this.emit(file.path, "upsert");
      })
    );

    this.refs.push(
      this.vault.on("delete", (file) => {
        if (file instanceof TFile) this.emit(file.path, "delete");
      })
    );

    this.refs.push(
      this.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile) {
          this.emit(oldPath, "delete");
          this.emit(file.path, "upsert");
        }
      })
    );
  }

  stop(): void {
    for (const ref of this.refs) {
      this.vault.offref(ref);
    }
    this.refs = [];
    this.onChange = null;
  }

  lockPath(path: string): void {
    this.writeLock.add(path);
    setTimeout(() => this.writeLock.delete(path), 1000);
  }

  updateGlobs(include: string[], exclude: string[]): void {
    this.include = include;
    this.exclude = exclude;
  }

  private emit(path: string, action: "upsert" | "delete"): void {
    if (this.writeLock.has(path)) return;
    if (!matchesGlobs(path, this.include, this.exclude)) return;
    this.onChange?.({ path, action });
  }
}
