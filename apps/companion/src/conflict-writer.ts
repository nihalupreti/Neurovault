import fs from "fs";
import path from "path";
import { log } from "./config.js";

export class ConflictWriter {
  constructor(private vaultPath: string) {}

  writeConflict(filePath: string, serverContent: string): void {
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);
    const conflictPath = `${base}.conflict${ext}`;
    const absPath = path.join(this.vaultPath, conflictPath);

    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, serverContent, "utf-8");
    log(`Conflict written: ${conflictPath}`);
  }

  checkResolved(filePath: string): boolean {
    const ext = path.extname(filePath);
    const base = filePath.slice(0, -ext.length);
    const conflictPath = path.join(this.vaultPath, `${base}.conflict${ext}`);
    return !fs.existsSync(conflictPath);
  }
}
