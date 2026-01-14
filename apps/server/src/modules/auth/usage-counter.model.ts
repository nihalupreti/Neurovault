import mongoose, { Schema } from "mongoose";

const usageCounterSchema = new Schema({
  ip: { type: String, required: true },
  date: { type: String, required: true },
  count: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

usageCounterSchema.index({ ip: 1, date: 1 }, { unique: true });
usageCounterSchema.index({ createdAt: 1 }, { expireAfterSeconds: 172800 });

export const UsageCounter = mongoose.model("UsageCounter", usageCounterSchema);
