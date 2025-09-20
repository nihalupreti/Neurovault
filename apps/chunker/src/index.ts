import { mqConnection } from "@neurovault/config";
import path from "path";
import { processMarkdown } from "./mdChunker/semanticChunker.js";

/**
 * Handler for incoming file upload messages
 */
async function handleFileUpload(message: { filePath: string; fileId: string }) {
  const { filePath, fileId } = message;
  console.log("filepath is", filePath);
  console.log("fileid is", fileId);
  const ext = path.extname(filePath).toLowerCase();

  try {
    switch (ext) {
      case ".md":
      case ".txt":
        await processMarkdown(filePath, fileId);
        break;
      case ".pdf":
        console.log("PDF chunker not implemented yet.");
        break;
      default:
        console.warn(`No chunker available for file type: ${ext}`);
    }
  } catch (err) {
    console.error(`Error processing file "${filePath}":`, err);
  }
}

/**
 * Start the dispatcher
 */
async function startDispatcher() {
  console.log("Starting file dispatcher...");

  await mqConnection.consume(handleFileUpload, "file_upload");
}

startDispatcher().catch((err) => console.error("Dispatcher fatal error:", err));
