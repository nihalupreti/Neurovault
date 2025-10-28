import { Types } from "mongoose";
import { handleFileUpload } from "../chunker/dispatcher.js";

export async function emitFileUploaded(
  filePath: string,
  fileId: Types.ObjectId
) {
  handleFileUpload(filePath, fileId.toString()).catch((err) =>
    console.error(`Chunker error for ${filePath}:`, err)
  );

  console.log(`Dispatched chunking for ${filePath}`);
}
