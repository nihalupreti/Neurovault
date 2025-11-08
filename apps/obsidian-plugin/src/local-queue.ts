import type { QueuedChange, SyncChange } from "./types";
import { toBase64, sha256 } from "./utils";

export class LocalQueue {
  private queue: QueuedChange[] = [];

  load(data: QueuedChange[]): void {
    this.queue = data || [];
  }

  getAll(): QueuedChange[] {
    return [...this.queue];
  }

  size(): number {
    return this.queue.length;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  async add(path: string, action: "upsert" | "delete", content?: string): Promise<void> {
    const existing = this.queue.findIndex((q) => q.path === path);
    if (existing >= 0) {
      this.queue.splice(existing, 1);
    }

    const hash = content ? await sha256(content) : "";

    this.queue.push({
      path,
      action,
      content: content ? toBase64(content) : undefined,
      hash,
      queuedAt: Date.now(),
    });
  }

  toSyncChanges(): SyncChange[] {
    return this.queue.map((q) => ({
      path: q.path,
      action: q.action,
      content: q.content,
      clientHash: q.hash,
    }));
  }

  clear(): void {
    this.queue = [];
  }

  async refreshContent(
    readFile: (path: string) => Promise<string | null>
  ): Promise<void> {
    for (const item of this.queue) {
      if (item.action === "delete") continue;
      const content = await readFile(item.path);
      if (content !== null) {
        item.content = toBase64(content);
        item.hash = await sha256(content);
      }
    }
  }
}
