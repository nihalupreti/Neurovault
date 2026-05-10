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
    public: {
      type: Boolean,
      default: false,
    },
    vaultId: {
      type: Schema.Types.ObjectId,
      ref: "Vault",
      default: null,
    },
    vaultPath: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

fileMetadataSchema.index({ parentId: 1, type: 1 });
fileMetadataSchema.index({ parentId: 1, name: 1, type: 1 });
fileMetadataSchema.index({ vaultId: 1, vaultPath: 1 });

fileMetadataSchema.pre("save", function (next) {
  if (this.serverPath) {
    this.serverPath = this.serverPath.replace(/\\/g, "/");
  }
  next();
});

export default mongoose.model("FileMetadata", fileMetadataSchema);
