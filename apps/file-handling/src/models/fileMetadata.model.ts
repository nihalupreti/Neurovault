import mongoose, { Schema } from "mongoose";

const fileMetadataSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    serverPath: {
      type: String,
      default: null,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    type: {
      type: String,
      required: true,
      enum: ["file", "folder"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("FileMetadata", fileMetadataSchema);
