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

fileMetadataSchema.pre("save", function (next) {
  if (this.serverPath) {
    let normalizedPath = this.serverPath.replace(/\\/g, "/");

    if (!normalizedPath.startsWith("D:/Neurovault")) {
      normalizedPath = `D:/Neurovault/${normalizedPath.replace(/^\/+/, "")}`;
    }

    this.serverPath = normalizedPath;
  }
  next();
});

export default mongoose.model("FileMetadata", fileMetadataSchema);
