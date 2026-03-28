import { watch, type FSWatcher } from "chokidar";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { log } from "./config.js";

export interface FileChange {
  relativePath: string;
  action: "upsert" | "delete";
}

export class FileWatcher {
  private watcher: FSWatcher | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pending = new Map<string, "upsert" | "delete">();
  private paused = false;

  constructor(
    private vaultPath: string,
    private include: string[],
    private exclude: string[],
    private debounceMs = 1000
  ) {}

  start(onChange: (changes: FileChange[]) => void): void {
    const ignored = [
      "**/node_modules/**",
      "**/.git/**",
      "**/.neurovault-plugin-active",
      "**/*.conflict.md",
      ...this.exclude,
    ];

    this.watcher = watch(this.vaultPath, {
      ignored,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300 },
    });

    this.watcher.on("add", (filePath: string) => this.handleEvent(filePath, "upsert", onChange));
    this.watcher.on("change", (filePath: string) => this.handleEvent(filePath, "upsert", onChange));
    this.watcher.on("unlink", (filePath: string) => this.handleEvent(filePath, "delete", onChange));
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  private handleEvent(
    absPath: string,
    action: "upsert" | "delete",
    onChange: (changes: FileChange[]) => void
  ): void {
    if (this.paused) return;

    const relativePath = path.relative(this.vaultPath, absPath).replace(/\\/g, "/");

    if (!this.matchesInclude(relativePath)) return;

    this.pending.set(relativePath, action);

    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const changes: FileChange[] = [];
      for (const [p, a] of this.pending) {
        changes.push({ relativePath: p, action: a });
      }
      this.pending.clear();
      onChange(changes);
    }, this.debounceMs);
  }

  private matchesInclude(relativePath: string): boolean {
    if (this.include.length === 0) return true;
    return this.include.some((pattern) => {
      if (pattern === "**/*.md") return relativePath.endsWith(".md");
      return true;
    });
  }
}
