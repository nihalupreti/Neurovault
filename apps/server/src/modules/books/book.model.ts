import mongoose, { Schema, type InferSchemaType } from "mongoose";

const bookChapterSchema = new Schema({
  bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true, index: true },
  number: { type: Number, required: true },
  title: { type: String, required: true },
  htmlContent: { type: String, required: true },
  plainText: { type: String, default: "" },
  sections: [
    {
      anchor: { type: String, required: true },
      title: { type: String, required: true },
      level: { type: Number, required: true },
    },
  ],
});

bookChapterSchema.index({ bookId: 1, number: 1 }, { unique: true });

const bookSchema = new Schema(
  {
    title: { type: String, required: true },
    topic: { type: String, default: "" },
    htmlHash: { type: String, required: true, index: true },
    chapters: [
      {
        number: { type: Number, required: true },
        title: { type: String, required: true },
        sectionAnchors: [{ type: String }],
      },
    ],
    totalChapters: { type: Number, default: 0 },
    indexingStatus: {
      type: String,
      enum: ["pending", "indexing", "ready", "failed"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export type BookDocument = InferSchemaType<typeof bookSchema>;
export type BookChapterDocument = InferSchemaType<typeof bookChapterSchema>;

export const Book = mongoose.model("Book", bookSchema);
export const BookChapter = mongoose.model("BookChapter", bookChapterSchema);
