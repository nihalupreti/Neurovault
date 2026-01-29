import mongoose, { Schema } from "mongoose";

const chunkTextSchema = new Schema({
  fileId: { type: String, required: true, index: true },
  chunkIndex: { type: Number, required: true },
  text: { type: String, required: true },
  source: { type: String, default: "note", index: true },
  bookId: { type: String },
  chapterNumber: { type: Number },
  sectionAnchor: { type: String },
  bookTitle: { type: String },
});

chunkTextSchema.index({ text: "text" });
chunkTextSchema.index({ fileId: 1, chunkIndex: 1 }, { unique: true });

export default mongoose.model("ChunkText", chunkTextSchema);
