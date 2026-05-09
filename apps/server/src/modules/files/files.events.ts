import { Types } from "mongoose";
import { getFileQueue } from "../worker/worker.queues.js";

export async function emitFileUploaded(filePath: string, fileId: Types.ObjectId): Promise<void> {
  await getFileQueue().add("chunk-file", { filePath, fileId: fileId.toString() });
  console.log(`Queued indexing for ${filePath}`);
}
