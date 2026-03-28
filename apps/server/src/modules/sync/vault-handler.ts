import { Request, Response } from "express";
import { Vault, FileVersion, ConflictRecord, EmbeddingJob } from "./models.js";
import { initRepo } from "./git-storage.js";
import { getQdrantClient } from "@neurovault/config";
import fs from "fs";
import path from "path";

const VAULTS_BASE = process.env.VAULTS_PATH || "data/vaults";
const COLLECTION_NAME = "neurovault";

export async function createVault(req: Request, res: Response) {
  const { name, include, exclude } = req.body;

  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "name is required" });
  }

  const vault = await Vault.create({
    name,
    gitPath: "",
    syncConfig: {
      include: include || ["**/*.md"],
      exclude: exclude || [".obsidian/**"],
    },
  });

  const gitPath = path.resolve(VAULTS_BASE, vault._id.toString());
  await initRepo(gitPath);

  vault.gitPath = gitPath;
  await vault.save();

  res.status(201).json(vault);
}

export async function getVault(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });
  res.json(vault);
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
  if (!vault) return res.status(404).json({ error: "vault not found" });
  res.json(vault);
}

export async function deleteVault(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });

  const vaultId = vault._id.toString();

  const versions = await FileVersion.find({ vaultId, deleted: false });
  const pointIds = versions.flatMap((v) =>
    v.chunks.map((c) => c.qdrantPointId)
  );

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
  await Vault.findByIdAndDelete(vaultId);

  if (vault.gitPath) {
    await fs.promises.rm(vault.gitPath, { recursive: true, force: true });
  }

  res.json({ success: true });
}

export async function getVaultStatus(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });

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

  res.json({
    vaultId: vault._id,
    name: vault.name,
    lastSyncedCommit: vault.lastSyncedCommit,
    fileCount,
    pendingEmbeddings: pendingJobs,
    failedEmbeddings: failedJobs,
    unresolvedConflicts,
  });
}
