import mongoose, { Schema, type InferSchemaType } from "mongoose";

const conversationSchema = new Schema(
  {
    contextType: {
      type: String,
      enum: ["book", "file", "vault"],
      required: true,
    },
    contextId: { type: String, required: true },
    title: { type: String, default: "New conversation" },
  },
  { timestamps: true },
);

conversationSchema.index({ contextType: 1, contextId: 1, updatedAt: -1 });

export type ConversationDocument = InferSchemaType<typeof conversationSchema>;
export const Conversation = mongoose.model("Conversation", conversationSchema);
