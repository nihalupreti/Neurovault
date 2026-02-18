import { Router, Request, Response } from "express";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import multer from "multer";
import fileModel from "../files/fileMetadata.model.js";
import { emitFileUploaded } from "../files/file-events.js";
import { formatEmailNote } from "./email-formatter.js";
import { generateFilename } from "./note-formatter.js";
import { checkEmailRateLimit } from "./email-rate-limiter.js";

const UPLOAD_DIR = "D:/Neurovault/uploads";
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10MB
const BLOCKED_EXTENSIONS = [".exe", ".bat", ".sh", ".cmd", ".ps1"];

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
  }),
  limits: { fileSize: MAX_ATTACHMENT_SIZE, files: 20 },
});

export function createEmailWebhookRouter(
  webhookSecret: string,
  allowlist: string
): Router {
  const router = Router();
  const allowedSenders = allowlist
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  router.post(
    "/",
    upload.array("attachments"),
    async (req: Request, res: Response) => {
      if (!webhookSecret) {
        return res.status(503).json({ error: "Email webhook not configured" });
      }

      const secret = req.headers["x-email-webhook-secret"];
      if (secret !== webhookSecret) {
        return res.status(401).json({ error: "Invalid webhook secret" });
      }

      const { from, subject, date, body } = req.body;
      const senderEmail = (from || "").toLowerCase().trim();

      if (allowedSenders.length === 0 || !allowedSenders.includes(senderEmail)) {
        return res.status(403).json({ error: "Sender not allowed" });
      }

      const files = (req.files as Express.Multer.File[]) || [];
      if ((!body || !body.trim()) && files.length === 0) {
        return res.status(400).json({ error: "Empty email: no body or attachments" });
      }

      const rateCheck = checkEmailRateLimit();
      if (!rateCheck.allowed) {
        return res.status(429).json({ error: "Email rate limit exceeded" });
      }

      try {
        const safeFiles = files.filter((f) => {
          const ext = path.extname(f.originalname).toLowerCase();
          return !BLOCKED_EXTENSIONS.includes(ext);
        });

        const attachmentIds: string[] = [];
        const attachmentNames: string[] = [];

        for (const file of safeFiles) {
          const doc = await fileModel.create({
            name: file.originalname,
            serverPath: file.path,
            type: "file",
          });
          attachmentIds.push(doc._id.toString());
          attachmentNames.push(file.originalname);

          const ext = path.extname(file.originalname).toLowerCase();
          if ([".md", ".txt"].includes(ext)) {
            const p = emitFileUploaded(file.path, doc._id);
            if (p && typeof p.catch === "function") p.catch(console.error);
          }
        }

        const emailDate = date || new Date().toISOString();
        const noteContent = formatEmailNote({
          from: senderEmail,
          subject: subject || "",
          date: emailDate,
          body: (body || "").trim(),
          attachments: attachmentNames,
        });

        const filename = generateFilename(subject || `Email from ${senderEmail}`);
        const serverPath = path.join(UPLOAD_DIR, `${Date.now()}-${filename}`);
        await mkdir(UPLOAD_DIR, { recursive: true });
        await writeFile(serverPath, noteContent, "utf-8");

        const noteDoc = await fileModel.create({
          name: filename,
          serverPath,
          type: "file",
        });

        const noteEmit = emitFileUploaded(noteDoc.serverPath, noteDoc._id);
        if (noteEmit && typeof noteEmit.catch === "function") noteEmit.catch(console.error);

        res.status(201).json({
          fileId: noteDoc._id.toString(),
          attachmentIds,
        });
      } catch (err: any) {
        console.error("Email webhook error:", err);
        res.status(500).json({ error: "Email processing failed" });
      }
    }
  );

  return router;
}
