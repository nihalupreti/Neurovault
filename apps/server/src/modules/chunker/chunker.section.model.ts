import mongoose, { Schema } from "mongoose";

const sectionContentSchema = new Schema({
  sectionId: { type: String, required: true, unique: true },
  headingPath: { type: [String], default: [] },
  content: { type: String, required: true },
  fileId: { type: String, required: true, index: true },
});

export default mongoose.model("SectionContent", sectionContentSchema);
