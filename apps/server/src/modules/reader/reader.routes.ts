import { Router } from "express";
import {
  handleGetProgress,
  handleUpdateProgress,
  handleListAnnotations,
  handleCreateAnnotation,
  handleUpdateAnnotation,
  handleDeleteAnnotation,
  handleGetRelated,
  handleExportObsidian,
} from "./reader.handler.js";

const router = Router();

router.get("/:bookId/progress", handleGetProgress);
router.put("/:bookId/progress", handleUpdateProgress);

router.get("/:bookId/annotations", handleListAnnotations);
router.post("/:bookId/annotations", handleCreateAnnotation);
router.put("/:bookId/annotations/:id", handleUpdateAnnotation);
router.delete("/:bookId/annotations/:id", handleDeleteAnnotation);

router.get("/:bookId/related/:sectionAnchor", handleGetRelated);
router.post("/:bookId/export/obsidian", handleExportObsidian);

export default router;
