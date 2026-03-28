import { Request, Response } from "express";
import { Vault } from "./models.js";
import { pushChanges, pullChanges, type SyncChange } from "./sync-service.js";

export async function handlePush(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });

  const { changes, baseCommit } = req.body as {
    changes: SyncChange[];
    baseCommit: string;
  };

  if (!Array.isArray(changes) || changes.length === 0) {
    return res.status(400).json({ error: "changes array required" });
  }

  const result = await pushChanges(vault, changes, baseCommit || "");
  res.json(result);
}

export async function handlePull(req: Request, res: Response) {
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });

  const since = (req.query.since as string) || "";
  if (!since) {
    return res.status(400).json({ error: "since query param required" });
  }

  const result = await pullChanges(vault, since);
  res.json(result);
}
