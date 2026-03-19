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
const upload = multer({
  dest: "uploads/books/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/html" || file.originalname.endsWith(".html") || file.originalname.endsWith(".htm")) {
      cb(null, true);
    } else {
      cb(new Error("Only HTML files are accepted"));
    }
  },
});

router.post("/import", upload.single("book"), handleImport);
router.get("/", handleListBooks);
router.get("/:id", handleGetBook);
router.get("/:id/chapters/:num", handleGetChapter);
router.delete("/:id", handleDeleteBook);

export default router;
