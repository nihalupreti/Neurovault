import express from "express";
import {
  createVault,
  getVault,
  updateVault,
  deleteVault,
  getVaultStatus,
} from "./sync.vault-handler.js";
import { handlePush, handlePull } from "./sync.handler.js";
import {
  getFileHistory,
  getFileAtVersion,
  listConflicts,
  resolveConflict,
} from "./sync.history-handler.js";
import { reconcileVault } from "./sync.reconciliation.js";
import { asHandler } from "../../utils/as-handler.js";
import { apiSuccess } from "../../utils/api-response.js";
import { NotFoundError } from "../../errors/app-error.js";

const router = express.Router();

router.post("/vault", asHandler(createVault));
router.get("/vault/:vaultId", asHandler(getVault));
router.patch("/vault/:vaultId", asHandler(updateVault));
router.delete("/vault/:vaultId", asHandler(deleteVault));

router.post("/:vaultId/push", asHandler(handlePush));
router.get("/:vaultId/pull", asHandler(handlePull));

router.get("/:vaultId/history/*", asHandler(getFileHistory));
router.get("/:vaultId/version/:commitSha/*", asHandler(getFileAtVersion));
router.get("/:vaultId/conflicts", asHandler(listConflicts));
router.post("/:vaultId/conflicts/:id/resolve", asHandler(resolveConflict));

router.get("/:vaultId/status", asHandler(getVaultStatus));

router.post("/:vaultId/reconcile", asHandler(async (req, res) => {
  const { Vault } = await import("./sync.models.js");
  const vault = await Vault.findById(req.params.vaultId);
  if (!vault) throw new NotFoundError("Vault", req.params.vaultId);
  const result = await reconcileVault(req.params.vaultId);
  apiSuccess(res, result);
}));

export default router;
