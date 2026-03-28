import { Request, Response } from "express";
import { Vault, FileVersion, ConflictRecord } from "./models.js";
import { readFileAtCommit, getHeadSha, writeAndCommit } from "./git-storage.js";
import { runIndexPipeline } from "./index-pipeline.js";

export async function getFileHistory(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });

  const filePath = req.params[0];
  if (!filePath) return res.status(400).json({ error: "filePath required" });

  const versions = await FileVersion.find({
    vaultId: vault._id,
    filePath,
  })
    .sort({ createdAt: -1 })
    .select("commitSha contentHash deleted createdAt");

  res.json({ filePath, versions });
}

export async function getFileAtVersion(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });

  const { commitSha } = req.params;
  const filePath = req.params[0];
  if (!commitSha || !filePath) {
    return res.status(400).json({ error: "commitSha and filePath required" });
  }

  try {
    const content = await readFileAtCommit(vault.gitPath, commitSha!, filePath);
    res.json({ filePath, commitSha, content });
  } catch {
    res.status(404).json({ error: "file not found at this version" });
  }
}

export async function listConflicts(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });

  const conflicts = await ConflictRecord.find({
    vaultId: vault._id,
    resolution: "pending",
  });

  res.json({ conflicts });
}

export async function resolveConflict(req: Request, res: Response) {
  const conflict = await ConflictRecord.findById(req.params.id);
  if (!conflict) return res.status(404).json({ error: "conflict not found" });

  const vault = await Vault.findById(conflict.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });

  const { resolution, content } = req.body as {
    resolution: "client" | "server" | "manual_merge";
    content?: string;
  };

  if (!resolution) {
    return res.status(400).json({ error: "resolution required" });
  }

  let resolvedContent: string;
  if (resolution === "client") {
    resolvedContent = conflict.clientContent;
  } else if (resolution === "server") {
    resolvedContent = conflict.serverContent;
  } else if (content) {
    resolvedContent = content;
  } else {
    return res.status(400).json({ error: "content required for manual_merge" });
  }

  const prevHead = await getHeadSha(vault.gitPath);
  const commitSha = await writeAndCommit(
    vault.gitPath,
    [{ path: conflict.filePath, content: resolvedContent }],
    [],
    `sync: resolve conflict in ${conflict.filePath}`
  );

  conflict.resolution = resolution;
  conflict.resolvedAt = new Date();
  conflict.clientCommit = commitSha;
  await conflict.save();

  runIndexPipeline(
    vault._id.toString(),
    vault.gitPath,
    prevHead,
    commitSha,
    vault.syncConfig?.include ?? ["**/*.md"],
    vault.syncConfig?.exclude ?? [".obsidian/**"]
  ).catch((err) => console.error("Index pipeline error:", err));

  res.json({ success: true, commitSha });
}
