import { Types } from "mongoose";
import fs from "fs";
import path from "path";
import FileMetadata from "./files.model.js";
import { Vault } from "../sync/sync.models.js";
import { writeAndCommit } from "../sync/sync.git-storage.js";

interface VaultContext {
  vaultId: Types.ObjectId;
  gitPath: string;
}

export async function findVaultContext(
  parentId: Types.ObjectId | string | null,
): Promise<VaultContext | null> {
  let currentId = parentId;

  while (currentId) {
    const folder = await FileMetadata.findById(currentId);
    if (!folder) return null;

    if (folder.vaultId) {
      const vault = await Vault.findById(folder.vaultId);
      if (!vault) return null;
      return { vaultId: folder.vaultId as Types.ObjectId, gitPath: vault.gitPath };
    }

    currentId = folder.parentId;
  }

  return null;
}

export async function computeVaultPath(
  fileOrFolderName: string,
  parentId: Types.ObjectId | string | null,
): Promise<string> {
  const segments: string[] = [fileOrFolderName];
  let currentId = parentId;

  while (currentId) {
    const folder = await FileMetadata.findById(currentId);
    if (!folder) break;
    if (folder.vaultPath === "") break;
    segments.unshift(folder.name);
    currentId = folder.parentId;
  }

  return segments.join("/");
}

export async function syncUploadToVault(
  vaultContext: VaultContext,
  vaultPath: string,
  diskPath: string,
): Promise<void> {
  const content = await fs.promises.readFile(path.resolve(diskPath), "utf-8");

  const commitSha = await writeAndCommit(
    vaultContext.gitPath,
    [{ path: vaultPath, content }],
    [],
    `ui: add ${vaultPath}`,
  );

  await Vault.findByIdAndUpdate(vaultContext.vaultId, {
    lastSyncedCommit: commitSha,
  });
}

export async function syncDeleteToVault(
  vaultContext: VaultContext,
  vaultPath: string,
): Promise<void> {
  const commitSha = await writeAndCommit(
    vaultContext.gitPath,
    [],
    [vaultPath],
    `ui: delete ${vaultPath}`,
  );

  await Vault.findByIdAndUpdate(vaultContext.vaultId, {
    lastSyncedCommit: commitSha,
  });
}
