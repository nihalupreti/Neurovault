import { Router } from "express";
import multer from "multer";
import {
  handleImport,
  handleListBooks,
  handleGetBook,
  handleGetChapter,
  handleDeleteBook,
} from "./books.handler.js";

const router = Router();
const upload = multer({ dest: "uploads/books/" });

router.post("/import", upload.single("book"), handleImport);
router.get("/", handleListBooks);
router.get("/:id", handleGetBook);
router.get("/:id/chapters/:num", handleGetChapter);
router.delete("/:id", handleDeleteBook);

export default router;
