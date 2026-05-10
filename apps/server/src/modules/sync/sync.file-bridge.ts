import { Types } from "mongoose";
import path from "path";
import fs from "fs";
import FileMetadata from "../files/files.model.js";
import { emitFileUploaded } from "../files/files.events.js";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

async function ensureVaultFolderChain(
  vaultId: Types.ObjectId,
  vaultRootId: Types.ObjectId,
  filePath: string,
): Promise<Types.ObjectId> {
  const parts = filePath.split("/");
  const folderParts = parts.slice(0, -1);

  let parentId: Types.ObjectId = vaultRootId;
  let currentVaultPath = "";

  for (const folderName of folderParts) {
    currentVaultPath = currentVaultPath ? `${currentVaultPath}/${folderName}` : folderName;

    let folder = await FileMetadata.findOne({
      vaultId,
      vaultPath: currentVaultPath,
      type: "folder",
    });

    if (!folder) {
      folder = await FileMetadata.create({
        name: folderName,
        parentId,
        type: "folder",
        vaultId,
        vaultPath: currentVaultPath,
      });
    }

    parentId = folder._id as Types.ObjectId;
  }

  return parentId;
}

export async function bridgeUpsert(
  vaultId: Types.ObjectId,
  vaultRootId: Types.ObjectId,
  filePath: string,
  contentBase64: string,
): Promise<void> {
  const content = Buffer.from(contentBase64, "base64").toString("utf-8");
  const fileName = path.basename(filePath);

  const parentId = await ensureVaultFolderChain(vaultId, vaultRootId, filePath);

  const diskName = `${Date.now()}-${fileName}`;
  const diskPath = path.join(UPLOAD_DIR, diskName);
  await fs.promises.mkdir(path.dirname(path.resolve(diskPath)), { recursive: true });
  await fs.promises.writeFile(path.resolve(diskPath), content, "utf-8");

  let doc = await FileMetadata.findOne({ vaultId, vaultPath: filePath, type: "file" });

  if (doc) {
    if (doc.serverPath) {
      try {
        await fs.promises.unlink(path.resolve(doc.serverPath));
      } catch {
        // old file already gone
      }
    }
    doc.serverPath = diskPath;
    doc.parentId = parentId;
    doc.name = fileName;
    await doc.save();
  } else {
    doc = await FileMetadata.create({
      name: fileName,
      serverPath: diskPath,
      parentId,
      type: "file",
      vaultId,
      vaultPath: filePath,
    });
  }

  emitFileUploaded(path.resolve(diskPath), doc._id as Types.ObjectId).catch((err) =>
    console.error("Vault bridge index error:", err),
  );
}

export async function bridgeDelete(vaultId: Types.ObjectId, filePath: string): Promise<void> {
  const doc = await FileMetadata.findOne({ vaultId, vaultPath: filePath, type: "file" });
  if (!doc) return;

  if (doc.serverPath) {
    try {
      await fs.promises.unlink(path.resolve(doc.serverPath));
    } catch {
      // file already gone
    }
  }

  const parentId = doc.parentId;
  await FileMetadata.findByIdAndDelete(doc._id);

  if (parentId) {
    await cleanEmptyFolders(vaultId, parentId);
  }
}

async function cleanEmptyFolders(
  vaultId: Types.ObjectId,
  folderId: Types.ObjectId | null,
): Promise<void> {
  if (!folderId) return;

  const folder = await FileMetadata.findById(folderId);
  if (!folder || !folder.vaultId || folder.vaultPath === "") return;

  const childCount = await FileMetadata.countDocuments({ parentId: folderId });
  if (childCount === 0) {
    const nextParent = folder.parentId as Types.ObjectId | null;
    await FileMetadata.findByIdAndDelete(folderId);
    await cleanEmptyFolders(vaultId, nextParent);
  }
}

export async function bridgeSyncChanges(
  vaultId: Types.ObjectId,
  vaultRootId: Types.ObjectId,
  changes: Array<{ path: string; action: "upsert" | "delete"; content?: string }>,
): Promise<void> {
  for (const change of changes) {
    if (change.action === "upsert" && change.content) {
      await bridgeUpsert(vaultId, vaultRootId, change.path, change.content);
    } else if (change.action === "delete") {
      await bridgeDelete(vaultId, change.path);
    }
  }
}
