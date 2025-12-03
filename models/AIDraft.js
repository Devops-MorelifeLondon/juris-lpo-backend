const mongoose = require("mongoose");

const draftSchema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: "TrainingDocument" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, refPath: "createdByModel" },
  createdByModel: { type: String, enum: ["Paralegal", "Attorney"] },

  prompt: String,
  output: String,

  sources: Array,
}, { timestamps: true });

module.exports = mongoose.model("AIDraft", draftSchema);
