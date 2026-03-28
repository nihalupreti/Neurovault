import fs from "fs";
import path from "path";

const LOCK_FILE = ".neurovault-plugin-active";

export class LockDetector {
  private timer: ReturnType<typeof setInterval> | null = null;
  private locked = false;

  constructor(private vaultPath: string) {}

  start(onLockChange: (locked: boolean) => void, intervalMs = 5000): void {
    this.check(onLockChange);
    this.timer = setInterval(() => this.check(onLockChange), intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }

  private check(onLockChange: (locked: boolean) => void): void {
    const lockPath = path.join(this.vaultPath, LOCK_FILE);
    const exists = fs.existsSync(lockPath);

    if (exists !== this.locked) {
      this.locked = exists;
      onLockChange(this.locked);
    }
  }
}
