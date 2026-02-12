import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import {
  initRepo,
  writeAndCommit,
  getLog,
  readFileAtCommit,
  getHeadSha,
  getChangedFiles,
} from "../git-storage.js";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "nv-git-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("git-storage", () => {
  it("initializes a bare repo and commits a file", async () => {
    await initRepo(tmpDir);
    const sha = await writeAndCommit(
      tmpDir,
      [{ path: "notes/hello.md", content: "# Hello" }],
      [],
      "initial commit"
    );
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it("reads a file at a specific commit", async () => {
    await initRepo(tmpDir);
    const sha1 = await writeAndCommit(
      tmpDir,
      [{ path: "test.md", content: "version 1" }],
      [],
      "v1"
    );
    await writeAndCommit(
      tmpDir,
      [{ path: "test.md", content: "version 2" }],
      [],
      "v2"
    );
    const content = await readFileAtCommit(tmpDir, sha1, "test.md");
    expect(content).toBe("version 1");
  });

  it("returns commit log", async () => {
    await initRepo(tmpDir);
    await writeAndCommit(tmpDir, [{ path: "a.md", content: "a" }], [], "first");
    await writeAndCommit(tmpDir, [{ path: "b.md", content: "b" }], [], "second");
    const log = await getLog(tmpDir);
    expect(log).toHaveLength(2);
    expect(log[0]!.commit.message).toBe("second\n");
  });

  it("returns HEAD sha", async () => {
    await initRepo(tmpDir);
    const sha = await writeAndCommit(tmpDir, [{ path: "a.md", content: "a" }], [], "init");
    const head = await getHeadSha(tmpDir);
    expect(head).toBe(sha);
  });

  it("handles file deletion", async () => {
    await initRepo(tmpDir);
    await writeAndCommit(tmpDir, [{ path: "del.md", content: "bye" }], [], "add");
    const sha = await writeAndCommit(tmpDir, [], ["del.md"], "delete");
    expect(sha).toMatch(/^[0-9a-f]{40}$/);
  });

  it("detects created, modified, and deleted files between commits", async () => {
    await initRepo(tmpDir);
    const sha1 = await writeAndCommit(
      tmpDir,
      [
        { path: "keep.md", content: "keep" },
        { path: "modify.md", content: "old" },
        { path: "delete.md", content: "gone" },
      ],
      [],
      "initial"
    );
    const sha2 = await writeAndCommit(
      tmpDir,
      [
        { path: "modify.md", content: "new" },
        { path: "created.md", content: "fresh" },
      ],
      ["delete.md"],
      "changes"
    );

    const changes = await getChangedFiles(tmpDir, sha1, sha2);
    const byPath = Object.fromEntries(changes.map((c) => [c.path, c.action]));
    expect(byPath["created.md"]).toBe("create");
    expect(byPath["modify.md"]).toBe("modify");
    expect(byPath["delete.md"]).toBe("delete");
    expect(byPath["keep.md"]).toBeUndefined();
  });
});
