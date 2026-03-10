import mongoose, { Schema, type InferSchemaType } from "mongoose";

const bookAnnotationSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true, index: true },
    chapterNumber: { type: Number, required: true },
    sectionAnchor: { type: String, required: true },
    type: { type: String, required: true, enum: ["highlight", "note", "vault-link"] },
    textRange: {
      startOffset: { type: Number, required: true },
      endOffset: { type: Number, required: true },
    },
    highlightedText: { type: String, required: true },
    color: { type: String, default: "#FFEB3B" },
    noteContent: { type: String, default: null },
    linkedNoteId: { type: Schema.Types.ObjectId, ref: "File", default: null },
  },
  { timestamps: true },
);

bookAnnotationSchema.index({ bookId: 1, chapterNumber: 1 });

const readingProgressSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true, unique: true },
    currentChapter: { type: Number, default: 1 },
    scrollPosition: { type: Number, default: 0 },
    chaptersCompleted: [{ type: Number }],
    timeSpentMinutes: { type: Map, of: Number, default: {} },
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export type BookAnnotationDocument = InferSchemaType<typeof bookAnnotationSchema>;
export type ReadingProgressDocument = InferSchemaType<typeof readingProgressSchema>;

export const BookAnnotation = mongoose.model("BookAnnotation", bookAnnotationSchema);
export const ReadingProgress = mongoose.model("ReadingProgress", readingProgressSchema);
