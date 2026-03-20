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
import { asHandler } from "../../utils/as-handler.js";

const router = Router();

router.get("/:bookId/progress", asHandler(handleGetProgress));
router.put("/:bookId/progress", asHandler(handleUpdateProgress));

router.get("/:bookId/annotations", asHandler(handleListAnnotations));
router.post("/:bookId/annotations", asHandler(handleCreateAnnotation));
router.put("/:bookId/annotations/:id", asHandler(handleUpdateAnnotation));
router.delete("/:bookId/annotations/:id", asHandler(handleDeleteAnnotation));

router.get("/:bookId/related/:sectionAnchor", asHandler(handleGetRelated));
router.post("/:bookId/export/obsidian", asHandler(handleExportObsidian));

export default router;
