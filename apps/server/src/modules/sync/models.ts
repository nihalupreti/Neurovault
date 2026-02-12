import mongoose, { Schema, type InferSchemaType } from "mongoose";

const vaultSchema = new Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: String, default: "" },
    gitPath: { type: String, required: true, unique: true },
    syncConfig: {
      include: { type: [String], default: ["**/*.md"] },
      exclude: { type: [String], default: [".obsidian/**"] },
    },
    lastSyncedCommit: { type: String, default: "" },
  },
  { timestamps: true }
);

const chunkSubSchema = new Schema(
  {
    index: { type: Number, required: true },
    contentHash: { type: String, required: true },
    qdrantPointId: { type: String, required: true },
  },
  { _id: false }
);

const fileVersionSchema = new Schema(
  {
    vaultId: { type: Schema.Types.ObjectId, ref: "Vault", required: true, index: true },
    filePath: { type: String, required: true },
    contentHash: { type: String, required: true },
    commitSha: { type: String, required: true },
    chunks: { type: [chunkSubSchema], default: [] },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

fileVersionSchema.index({ vaultId: 1, filePath: 1 });

const conflictRecordSchema = new Schema({
  vaultId: { type: Schema.Types.ObjectId, ref: "Vault", required: true, index: true },
  filePath: { type: String, required: true },
  baseCommit: { type: String, required: true },
  serverCommit: { type: String, required: true },
  clientCommit: { type: String, required: true },
  serverContent: { type: String, default: "" },
  clientContent: { type: String, default: "" },
  baseContent: { type: String, default: "" },
  resolution: {
    type: String,
    enum: ["client", "server", "manual_merge", "pending"],
    default: "pending",
  },
  resolvedAt: { type: Date, default: null },
});

const embeddingJobSchema = new Schema({
  vaultId: { type: Schema.Types.ObjectId, ref: "Vault", required: true, index: true },
  filePath: { type: String, required: true },
  commitSha: { type: String, required: true },
  status: {
    type: String,
    enum: ["pending", "processing", "failed", "completed"],
    default: "pending",
  },
  attempts: { type: Number, default: 0 },
  lastError: { type: String, default: "" },
  nextRetryAt: { type: Date, default: null },
});

embeddingJobSchema.index({ status: 1, nextRetryAt: 1 });

export type VaultDoc = InferSchemaType<typeof vaultSchema> & { _id: mongoose.Types.ObjectId };
export type FileVersionDoc = InferSchemaType<typeof fileVersionSchema> & { _id: mongoose.Types.ObjectId };

export const Vault = mongoose.model("Vault", vaultSchema);
export const FileVersion = mongoose.model("FileVersion", fileVersionSchema);
export const ConflictRecord = mongoose.model("ConflictRecord", conflictRecordSchema);
export const EmbeddingJob = mongoose.model("EmbeddingJob", embeddingJobSchema);
