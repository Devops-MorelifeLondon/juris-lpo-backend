const mongoose = require('mongoose');

/* ===========================
   REPLY (Attorney or Paralegal)
=========================== */
const replySchema = new mongoose.Schema({
  repliedById: { type: mongoose.Schema.Types.ObjectId, required: true },
  repliedByRole: { type: String, enum: ["Paralegal", "Attorney"], required: true },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

/* ===========================
   COMMENT (Paralegal only)
=========================== */
const commentSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdById: { type: mongoose.Schema.Types.ObjectId, required: true },  // Paralegal
  createdAt: { type: Date, default: Date.now },

  replies: [replySchema] // Replies from attorneys or paralegal
});

/* ===========================
   DOCUMENT FILE WITH PROGRESS
=========================== */
const fileSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  s3Url: { type: String },
  originalFileName: { type: String, required: true },
  fileType: { type: String },
  fileSize: { type: Number },

  // Only one paralegal — single progress field
  progress: {
    percentageRead: { type: Number, default: 0 },  // 0–100
    lastUpdated: { type: Date, default: Date.now }
  },

  // Comments for this document file
  comments: [commentSchema]
});

/* ===========================
   VIDEO WITH PROGRESS
=========================== */
const videoSchema = new mongoose.Schema({
  isUrl: { type: Boolean, default: false },
  url: { type: String },
  filePath: { type: String },
  s3Url: { type: String },
  originalFileName: { type: String },
  fileType: { type: String },
  fileSize: { type: Number },

  // Only one paralegal — single progress field
  progress: {
    percentageWatched: { type: Number, default: 0 }, // 0–100
    lastUpdated: { type: Date, default: Date.now }
  },

  // Comments for this video
  comments: [commentSchema]
});

/* ===========================
   MAIN TRAINING DOCUMENT
=========================== */
const trainingDocumentSchema = new mongoose.Schema({
  documentName: { type: String, required: true },

  documentType: {
    type: String,
    required: true,
    enum: ['AI Draft', 'Paralegal Template', 'SOP', 'Research Material', 'Other'],
  },

  assignedTo: {
    type: String,
    required: true,
    enum: ['AI', 'Paralegal', 'Both'],
  },

  // One paralegal — no array
  paralegalAssignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Paralegal'
  },

  priority: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low',
  },

  description: { type: String },

  // Individual files + videos with their progress + comments
  files: [fileSchema],
  videos: [videoSchema],

  uploadedBy: { type: String },
  uploadedById: { type: mongoose.Schema.Types.ObjectId },
  uploadedByModel: { type: String },

  status: {
    type: String,
    enum: ['Pending Review', 'In Training', 'Completed'],
    default: 'Pending Review',
  },

}, { timestamps: true });

module.exports = mongoose.model('TrainingDocument', trainingDocumentSchema);
