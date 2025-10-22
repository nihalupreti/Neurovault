import {
  getFolderTree,
  handleFileRequest,
  handleFileUploads,
  handleFolderUploads,
} from "./file-handler.js";

import express from "express";
import { upload } from "./fileupload.config.js";

const router = express.Router();

router.post("/upload/file", upload.array("files"), handleFileUploads);
router.post("/upload/folder", upload.array("files"), handleFolderUploads);
router.get("/", handleFileRequest);
router.get("/folder", getFolderTree);

export default router;
