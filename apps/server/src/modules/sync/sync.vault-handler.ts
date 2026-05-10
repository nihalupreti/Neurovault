import { Request, Response } from "express";
import { Vault, FileVersion, ConflictRecord, EmbeddingJob } from "./sync.models.js";
import { initRepo } from "./sync.git-storage.js";
import { getQdrantClient } from "@neurovault/config";
import FileMetadata from "../files/files.model.js";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { apiSuccess, apiCreated } from "../../utils/api-response.js";
import { VaultNotFoundError } from "./sync.errors.js";
import { createVaultSchema } from "@neurovault/shared/schemas";

const VAULTS_BASE = process.env.VAULTS_PATH || "data/vaults";
const COLLECTION_NAME = "neurovault";

export async function createVault(req: Request, res: Response) {
  const { name, syncConfig } = createVaultSchema.parse(req.body);

  const vaultId = new mongoose.Types.ObjectId();
  const gitPath = path.resolve(VAULTS_BASE, vaultId.toString());

  await initRepo(gitPath);

  const vault = await Vault.create({
    _id: vaultId,
    name,
    gitPath,
    syncConfig: {
      include: syncConfig?.include || ["**/*.md"],
      exclude: syncConfig?.exclude || [".obsidian/**"],
    },
  });

  await FileMetadata.create({
    name,
    type: "folder",
    parentId: null,
    vaultId: vault._id,
    vaultPath: "",
  });

  apiCreated(res, vault);
}

export async function getVault(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);
  apiSuccess(res, vault);
}

export async function updateVault(req: Request, res: Response) {
  const { name, include, exclude } = req.body;
  const update: Record<string, any> = {};

  if (name) update.name = name;
  if (include) update["syncConfig.include"] = include;
  if (exclude) update["syncConfig.exclude"] = exclude;

  const vault = await Vault.findByIdAndUpdate(req.params.vaultId, update, {
    new: true,
  });
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);
  apiSuccess(res, vault);
}

export async function deleteVault(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);

  const vaultId = vault._id.toString();

  const versions = await FileVersion.find({ vaultId, deleted: false });
  const pointIds = versions.flatMap((v) => v.chunks.map((c) => c.qdrantPointId));

  if (pointIds.length > 0) {
    const client = getQdrantClient();
    await client.delete(COLLECTION_NAME, {
      wait: true,
      points: pointIds,
    });
  }

  await FileVersion.deleteMany({ vaultId });
  await ConflictRecord.deleteMany({ vaultId });
  await EmbeddingJob.deleteMany({ vaultId });
  await FileMetadata.deleteMany({ vaultId: vault._id });
  await Vault.findByIdAndDelete(vaultId);

  if (vault.gitPath) {
    await fs.promises.rm(vault.gitPath, { recursive: true, force: true });
  }

  apiSuccess(res, { success: true });
}

export async function getVaultStatus(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);

  const pendingJobs = await EmbeddingJob.countDocuments({
    vaultId: vault._id,
    status: { $in: ["pending", "processing"] },
  });
  const failedJobs = await EmbeddingJob.countDocuments({
    vaultId: vault._id,
    status: "failed",
  });
  const unresolvedConflicts = await ConflictRecord.countDocuments({
    vaultId: vault._id,
    resolution: "pending",
  });
  const fileCount = await FileVersion.countDocuments({
    vaultId: vault._id,
    deleted: false,
  });

  apiSuccess(res, {
    vaultId: vault._id,
    name: vault.name,
    lastSyncedCommit: vault.lastSyncedCommit,
    fileCount,
    pendingEmbeddings: pendingJobs,
    failedEmbeddings: failedJobs,
    unresolvedConflicts,
  });
}
