const mongoose = require("mongoose");

const vectorSchema = new mongoose.Schema({
  docId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "TrainingDocument" 
  },

  // 🔥 NEW — stores actual formatted HTML chunk
  html: { 
    type: String, 
    required: true 
  },

  // 🔥 Optional — clean plain-text version for fallback/search
  rawText: { 
    type: String 
  },

  // page number from original doc
  page: Number,

  // extracted heading (if any)
  heading: String,

  // vector embedding
  embedding: {
    type: [Number],
    index: "flat",
    dimensions: 1536, // embedding-3-small
  },

  // 🔥 NEW — store formatting, tag count, word count, etc.
  metadata: {
    type: Object,
    default: {}
  }
});

module.exports = mongoose.model("AIVector", vectorSchema, "training_vectors");
