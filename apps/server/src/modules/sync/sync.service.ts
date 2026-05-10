import { Types } from "mongoose";
import {
  writeAndCommit,
  getHeadSha,
  getChangedFiles,
  readFileAtCommit,
  readFileAtHead,
  type FileWrite,
} from "./sync.git-storage.js";
import { getSyncIndexQueue } from "../worker/worker.queues.js";
import { notifyVaultChanged } from "./sync.ws-manager.js";
import { ConflictRecord } from "./sync.models.js";
import type { VaultDoc } from "./sync.models.js";
import type { SyncChange, PushResult, PullChange, PullResult } from "@neurovault/shared/types";
import { bridgeSyncChanges } from "./sync.file-bridge.js";
import FileMetadata from "../files/files.model.js";

const vaultLocks = new Map<string, Promise<void>>();

async function withVaultLock<T>(vaultId: string, fn: () => Promise<T>): Promise<T> {
  const prev = vaultLocks.get(vaultId) ?? Promise.resolve();
  let release: () => void;
  const next = new Promise<void>((r) => {
    release = r;
  });
  vaultLocks.set(vaultId, next);

  await prev;
  try {
    return await fn();
  } finally {
    release!();
    if (vaultLocks.get(vaultId) === next) {
      vaultLocks.delete(vaultId);
    }
  }
}

export async function pushChanges(
  vault: VaultDoc & { _id: Types.ObjectId },
  changes: SyncChange[],
  baseCommit: string,
): Promise<PushResult> {
  return withVaultLock(vault._id.toString(), async () => {
    const dir = vault.gitPath;
    const head = await getHeadSha(dir);

    const vaultRoot = await FileMetadata.findOne({
      vaultId: vault._id,
      vaultPath: "",
      type: "folder",
    });

    if (baseCommit && baseCommit !== head) {
      const serverChanges = await getChangedFiles(dir, baseCommit, head);
      const serverPaths = new Set(serverChanges.map((c) => c.path));
      const clientPaths = new Set(changes.map((c) => c.path));

      const overlapping = [...clientPaths].filter((p) => serverPaths.has(p));

      if (overlapping.length > 0) {
        const conflicts = [];
        for (const filepath of overlapping) {
          const clientChange = changes.find((c) => c.path === filepath)!;
          let serverVersion = "";
          let baseVersion = "";

          try {
            serverVersion = await readFileAtHead(dir, filepath);
          } catch {
            /* deleted on server */
          }

          try {
            baseVersion = await readFileAtCommit(dir, baseCommit, filepath);
          } catch {
            /* didn't exist at base */
          }

          const clientVersion = clientChange.content
            ? Buffer.from(clientChange.content, "base64").toString("utf-8")
            : "";

          conflicts.push({
            path: filepath,
            serverVersion,
            clientVersion,
            baseVersion,
          });

          await ConflictRecord.create({
            vaultId: vault._id,
            filePath: filepath,
            baseCommit,
            serverCommit: head,
            clientCommit: "pending",
            serverContent: serverVersion,
            clientContent: clientVersion,
            baseContent: baseVersion,
          });
        }

        const nonConflicting = changes.filter((c) => !overlapping.includes(c.path));

        let commitSha = head;
        if (nonConflicting.length > 0) {
          commitSha = await applyChanges(dir, nonConflicting);
          if (vaultRoot) {
            await bridgeSyncChanges(vault._id, vaultRoot._id as Types.ObjectId, nonConflicting);
          }
        }

        notifyVaultChanged(vault._id.toString(), commitSha);
        return { commitSha, conflicts };
      }
    }

    const commitSha = await applyChanges(dir, changes);

    if (vaultRoot) {
      await bridgeSyncChanges(vault._id, vaultRoot._id as Types.ObjectId, changes);
    }

    const fromSha = baseCommit || head;
    const include = vault.syncConfig?.include ?? ["**/*.md"];
    const exclude = vault.syncConfig?.exclude ?? [".obsidian/**"];
    await getSyncIndexQueue().add("sync-index", {
      vaultId: vault._id.toString(),
      gitPath: dir,
      fromSha,
      toSha: commitSha,
      include,
      exclude,
    });

    notifyVaultChanged(vault._id.toString(), commitSha);
    return { commitSha };
  });
}

async function applyChanges(dir: string, changes: SyncChange[]): Promise<string> {
  const writes: FileWrite[] = [];
  const deletes: string[] = [];

  for (const change of changes) {
    if (change.action === "upsert" && change.content) {
      writes.push({
        path: change.path,
        content: Buffer.from(change.content, "base64").toString("utf-8"),
      });
    } else if (change.action === "delete") {
      deletes.push(change.path);
    }
  }

  const paths = [...writes.map((w) => w.path), ...deletes.map((d) => `delete ${d}`)];
  const message = `sync: ${paths.join(", ")}`;

  return writeAndCommit(dir, writes, deletes, message);
}

export async function pullChanges(
  vault: VaultDoc & { _id: Types.ObjectId },
  sinceSha: string,
): Promise<PullResult> {
  const dir = vault.gitPath;
  const head = await getHeadSha(dir);

  if (sinceSha === head) {
    return { changes: [], currentCommit: head, hasMore: false };
  }

  const changed = await getChangedFiles(dir, sinceSha, head);
  const changes: PullChange[] = [];

  for (const file of changed) {
    if (file.action === "delete") {
      changes.push({
        path: file.path,
        action: "delete",
        contentHash: "",
      });
    } else {
      const content = await readFileAtCommit(dir, head, file.path);
      const { hashChunk } = await import("./sync.chunk-differ.js");
      changes.push({
        path: file.path,
        action: "upsert",
        content: Buffer.from(content, "utf-8").toString("base64"),
        contentHash: hashChunk(content),
      });
    }
  }

  return { changes, currentCommit: head, hasMore: false };
}
