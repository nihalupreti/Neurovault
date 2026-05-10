import {
  getFolderTree,
  handleFileRequest,
  handleFileUploads,
  handleFolderUploads,
  toggleVisibility,
  handleDeleteFile,
} from "./files.handler.js";

import express from "express";
import { upload } from "./files.upload-config.js";
import { asHandler } from "../../utils/as-handler.js";

const router = express.Router();

router.post("/upload/file", upload.array("files"), asHandler(handleFileUploads));
router.post("/upload/folder", upload.array("files"), asHandler(handleFolderUploads));
router.get("/", asHandler(handleFileRequest));
router.get("/folder", asHandler(getFolderTree));
router.patch("/:id/visibility", asHandler(toggleVisibility));
router.delete("/:id", asHandler(handleDeleteFile));

export default router;
