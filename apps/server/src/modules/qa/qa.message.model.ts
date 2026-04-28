import mongoose, { Schema, type InferSchemaType } from "mongoose";

const messageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: "Conversation",
    required: true,
  },
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: { type: String, required: true },
  citations: {
    type: [
      {
        sourceIndex: { type: Number, required: true },
        fileId: { type: String, required: true },
        fileName: { type: String, required: true },
        excerpt: { type: String, required: true },
      },
    ],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ conversationId: 1, createdAt: 1 });

export type MessageDocument = InferSchemaType<typeof messageSchema>;
export const QAMessage = mongoose.model("QAMessage", messageSchema);
