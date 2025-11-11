import { createHash } from "crypto";
import fs from "fs";
import path from "path";

export interface QueuedChange {
  path: string;
  action: "upsert" | "delete";
  content?: string;
  hash: string;
}

export class ChangeQueue {
  private changes = new Map<string, QueuedChange>();

  add(filePath: string, action: "upsert" | "delete", content?: string): void {
    const hash = content
      ? createHash("sha256").update(content, "utf-8").digest("hex")
      : "";
    this.changes.set(filePath, {
      path: filePath,
      action,
      content: content ? Buffer.from(content, "utf-8").toString("base64") : undefined,
      hash,
    });
  }

  drain(): QueuedChange[] {
    const items = [...this.changes.values()];
    this.changes.clear();
    return items;
  }

  size(): number {
    return this.changes.size;
  }

  isEmpty(): boolean {
    return this.changes.size === 0;
  }
}
