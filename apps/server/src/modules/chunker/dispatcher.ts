import path from "path";
import { processMarkdown } from "./semanticChunker.js";

export async function handleFileUpload(filePath: string, fileId: string) {
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
