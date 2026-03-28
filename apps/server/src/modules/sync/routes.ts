import express from "express";
import {
  createVault,
  getVault,
  updateVault,
  deleteVault,
  getVaultStatus,
} from "./vault-handler.js";
import { handlePush, handlePull } from "./sync-handler.js";
import {
  getFileHistory,
  getFileAtVersion,
  listConflicts,
  resolveConflict,
} from "./history-handler.js";
import { reconcileVault } from "./reconciliation.js";

const router = express.Router();

router.post("/vault", createVault);
router.get("/vault/:vaultId", getVault);
router.patch("/vault/:vaultId", updateVault);
router.delete("/vault/:vaultId", deleteVault);

router.post("/:vaultId/push", handlePush);
router.get("/:vaultId/pull", handlePull);

router.get("/:vaultId/history/*", getFileHistory);
router.get("/:vaultId/version/:commitSha/*", getFileAtVersion);
router.get("/:vaultId/conflicts", listConflicts);
router.post("/:vaultId/conflicts/:id/resolve", resolveConflict);

router.get("/:vaultId/status", getVaultStatus);

router.post("/:vaultId/reconcile", async (req, res) => {
  const { Vault } = await import("./models.js");
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) return res.status(404).json({ error: "vault not found" });
  const result = await reconcileVault(req.params.vaultId);
  res.json(result);
});

export default router;
