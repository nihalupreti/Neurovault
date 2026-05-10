import { Router } from "express";
import multer from "multer";
import {
  handleImport,
  handleListBooks,
  handleGetBook,
  handleGetChapter,
  handleDeleteBook,
} from "./books.handler.js";
import { handleGetAsset } from "./books.assets.handler.js";
import { asHandler } from "../../utils/as-handler.js";

const router = Router();

const ALLOWED_EXTENSIONS = [".html", ".htm", ".epub"];
const ALLOWED_MIMETYPES = ["text/html", "application/epub+zip"];

const upload = multer({
  dest: "uploads/books/",
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));
    if (ALLOWED_MIMETYPES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only HTML and EPUB files are accepted"));
    }
  },
});

router.post("/import", upload.single("book"), asHandler(handleImport));
router.get("/", asHandler(handleListBooks));
router.get("/:id", asHandler(handleGetBook));
router.get("/:id/chapters/:num", asHandler(handleGetChapter));
router.get("/:id/assets/*filePath", asHandler(handleGetAsset));
router.delete("/:id", asHandler(handleDeleteBook));

export default router;
