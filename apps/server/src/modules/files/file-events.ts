import { Types } from "mongoose";
import { handleFileUpload } from "../chunker/dispatcher.js";
import { onFileIndexed } from "./graph-hook.js";

export async function emitFileUploaded(
  filePath: string,
  fileId: Types.ObjectId
) {
  handleFileUpload(filePath, fileId.toString()).catch((err) =>
    console.error(`Chunker error for ${filePath}:`, err)
  );

  onFileIndexed(filePath, fileId.toString()).catch((err) =>
    console.error(`Graph index error for ${filePath}:`, err)
  );

  console.log(`Dispatched chunking + graph indexing for ${filePath}`);
}
