import { Request, Response } from "express";
import { Vault } from "./sync.models.js";
import { pushChanges, pullChanges } from "./sync.service.js";
import { apiSuccess } from "../../utils/api-response.js";
import { VaultNotFoundError, InvalidSyncPayloadError } from "./sync.errors.js";
import { pushChangesSchema } from "./sync.schemas.js";

export async function handlePush(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);

  const { changes, baseCommit } = pushChangesSchema.parse(req.body);

  const result = await pushChanges(vault, changes, baseCommit);
  apiSuccess(res, result);
}

export async function handlePull(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new VaultNotFoundError(req.params.vaultId);

  const since = (req.query.since as string) || "";
  if (!since) {
    throw new InvalidSyncPayloadError("since query param required");
  }

  const result = await pullChanges(vault, since);
  apiSuccess(res, result);
}
