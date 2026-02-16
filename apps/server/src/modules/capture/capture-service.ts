// apps/server/src/modules/capture/capture-service.ts
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import fileModel from "../files/fileMetadata.model.js";
import { emitFileUploaded } from "../files/file-events.js";
import { validateUrl } from "./url-validator.js";
import { classifyUrl, UrlType } from "./url-classifier.js";
import { fetchUrl } from "./url-fetcher.js";
import { extractArticle, extractMeta } from "./content-extractor.js";
import {
  formatArticleNote,
  formatBookmarkNote,
  formatRawNote,
  generateFilename,
} from "./note-formatter.js";

const UPLOAD_DIR = "D:/Neurovault/uploads";
const URL_REGEX = /^https?:\/\//i;

export interface CaptureInput {
  content: string;
  note?: string;
  folderId?: string;
}

export interface CaptureResult {
  fileId: string;
  status: "complete" | "processing";
}

export async function captureContent(input: CaptureInput): Promise<CaptureResult> {
  const isUrl = URL_REGEX.test(input.content.trim());

  if (isUrl) {
    return handleUrlCapture(input);
  }

  return handleTextCapture(input);
}

async function handleTextCapture(input: CaptureInput): Promise<CaptureResult> {
  const text = input.content.trim();
  const firstLine = text.split("\n")[0]?.replace(/^#\s*/, "") || "";
  const filename = generateFilename(firstLine);

  let body = formatRawNote(text);
  if (input.note) {
    body = `> ${input.note}\n\n${body}`;
  }

  const serverPath = path.join(UPLOAD_DIR, `${Date.now()}-${filename}`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(serverPath, body, "utf-8");

  const doc = await fileModel.create({
    name: filename,
    serverPath,
    type: "file",
    parentId: input.folderId || null,
  });

  Promise.resolve(emitFileUploaded(doc.serverPath, doc._id)).catch((err) =>
    console.error("Capture index error:", err)
  );

  return { fileId: doc._id.toString(), status: "complete" };
}

async function handleUrlCapture(input: CaptureInput): Promise<CaptureResult> {
  const url = input.content.trim();

  const placeholderFilename = generateFilename("");
  const serverPath = path.join(UPLOAD_DIR, `${Date.now()}-${placeholderFilename}`);
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(serverPath, `Capturing: ${url}`, "utf-8");

  const doc = await fileModel.create({
    name: placeholderFilename,
    serverPath,
    type: "file",
    parentId: input.folderId || null,
  });

  processUrlInBackground(url, doc._id.toString(), serverPath, input.note).catch(
    (err) => console.error("URL capture background error:", err)
  );

  return { fileId: doc._id.toString(), status: "processing" };
}

async function processUrlInBackground(
  url: string,
  fileId: string,
  serverPath: string,
  note?: string
): Promise<void> {
  const validation = validateUrl(url);
  if (!validation.valid) {
    const body = formatBookmarkNote({
      source: url,
      title: url,
      description: `Could not fetch: ${validation.reason}`,
      captured: new Date().toISOString(),
    });
    await writeFile(serverPath, body, "utf-8");
    await fileModel.findByIdAndUpdate(fileId, { name: generateFilename(url) });
    emitFileUploaded(serverPath, fileId as any).catch(console.error);
    return;
  }

  const fetchResult = await fetchUrl(url);
  if (!fetchResult.ok) {
    const body = formatBookmarkNote({
      source: url,
      title: url,
      description: `Could not fetch: ${fetchResult.error}`,
      captured: new Date().toISOString(),
    });
    await writeFile(serverPath, body, "utf-8");
    await fileModel.findByIdAndUpdate(fileId, { name: generateFilename(url) });
    emitFileUploaded(serverPath, fileId as any).catch(console.error);
    return;
  }

  const type = classifyUrl(url);
  const captured = new Date().toISOString();
  let body: string;
  let title: string;

  if (type === UrlType.Article) {
    const extracted = extractArticle(fetchResult.html);
    title = extracted.title || url;
    const content =
      extracted.content.length >= 50
        ? extracted.content
        : extractMeta(fetchResult.html).description || extracted.content;
    body = formatArticleNote({ source: url, title, content, captured });
  } else {
    const meta = extractMeta(fetchResult.html);
    title = meta.title || url;
    body = formatBookmarkNote({
      source: url,
      title,
      description: meta.description,
      captured,
    });
  }

  if (note) {
    body = body.replace(/\n---\n\n/, `\n---\n\n> ${note}\n\n`);
  }

  const finalFilename = generateFilename(title);
  const finalPath = path.join(UPLOAD_DIR, `${Date.now()}-${finalFilename}`);
  await writeFile(finalPath, body, "utf-8");
  await fileModel.findByIdAndUpdate(fileId, {
    name: finalFilename,
    serverPath: finalPath,
  });

  emitFileUploaded(finalPath, fileId as any).catch(console.error);
}
