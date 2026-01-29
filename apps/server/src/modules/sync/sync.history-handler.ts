import { Request, Response } from "express";
import { Vault, FileVersion, ConflictRecord } from "./sync.models.js";
import { readFileAtCommit, getHeadSha, writeAndCommit } from "./sync.git-storage.js";
import { runIndexPipeline } from "./sync.index-pipeline.js";
import { apiSuccess } from "../../utils/api-response.js";
import { NotFoundError } from "../../errors/app-error.js";
import { VaultNotFoundError, ConflictNotFoundError, InvalidSyncPayloadError } from "./sync.errors.js";
import { resolveConflictSchema } from "@neurovault/shared/schemas";

export async function getFileHistory(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);

  const filePath = req.params[0];
  if (!filePath) throw new InvalidSyncPayloadError("filePath required");

  const versions = await FileVersion.find({
    vaultId: vault._id,
    filePath,
  })
    .sort({ createdAt: -1 })
    .select("commitSha contentHash deleted createdAt");

  apiSuccess(res, { filePath, versions });
}

export async function getFileAtVersion(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);

  const { commitSha } = req.params;
  const filePath = req.params[0];
  if (!commitSha || !filePath) {
    throw new InvalidSyncPayloadError("commitSha and filePath required");
  }

  try {
    const content = await readFileAtCommit(vault.gitPath, commitSha!, filePath);
    apiSuccess(res, { filePath, commitSha, content });
  } catch {
    throw new NotFoundError("File", `${filePath}@${commitSha}`);
  }
}

export async function listConflicts(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);

  const conflicts = await ConflictRecord.find({
    vaultId: vault._id,
    resolution: "pending",
  });

  apiSuccess(res, { conflicts });
}

export async function resolveConflict(req: Request, res: Response) {
  const conflictId = req.params.id as string;
  const conflict = await ConflictRecord.findById(conflictId);
  if (!conflict) throw new ConflictNotFoundError(conflictId);

  const vault = await Vault.findById(conflict.vaultId);
  if (!vault) throw new VaultNotFoundError();

  const { resolution, content } = resolveConflictSchema.parse(req.body);

  let resolvedContent: string;
  if (resolution === "accept_client") {
    resolvedContent = conflict.clientContent;
  } else if (resolution === "accept_server") {
    resolvedContent = conflict.serverContent;
  } else {
    resolvedContent = content!;
  }

  const resolutionMap = {
    accept_client: "client",
    accept_server: "server",
    manual_merge: "manual_merge",
  } as const;

  const prevHead = await getHeadSha(vault.gitPath);
  const commitSha = await writeAndCommit(
    vault.gitPath,
    [{ path: conflict.filePath, content: resolvedContent }],
    [],
    `sync: resolve conflict in ${conflict.filePath}`
  );

  conflict.resolution = resolutionMap[resolution];
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

  apiSuccess(res, { success: true, commitSha });
}
