const mongoose = require('mongoose');
require('./Attorney');   // <-- IMPORTANT
require('./Paralegal');  // <-- IMPORTANT



/* ===========================
   REPLY SCHEMA (Simplified - Embed User Data)
=========================== */
const replySchema = new mongoose.Schema({
  repliedBy: {  // Embed name and email directly
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    fullName: { type: String },
    email: { type: String },
    role: { type: String, enum: ["Paralegal", "Attorney"], required: true },  // Keep role for filtering
    _id: { type: mongoose.Schema.Types.ObjectId, required: true }  // Keep ID for other uses
  },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

/* ===========================
   COMMENT SCHEMA (Simplified - Embed User Data)
=========================== */
const commentSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdBy: {  // Embed name and email directly
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String },
    email: { type: String },
    role: { type: String, enum: ['Attorney', 'Paralegal'], required: true },  // Keep role for filtering
    _id: { type: mongoose.Schema.Types.ObjectId, required: true }  // Keep ID for other uses
  },
  createdAt: { type: Date, default: Date.now },
  replies: [replySchema]
});


/* ===========================
   FILE PROGRESS PER PARALEGAL
=========================== */
const fileProgressSchema = new mongoose.Schema({
  paralegalId: { type: mongoose.Schema.Types.ObjectId, ref: "Paralegal", required: true },
  percentageRead: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

/* ===========================
   FILE SCHEMA
=========================== */
const fileSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  s3Url: { type: String },
  originalFileName: { type: String, required: true },
  fileType: { type: String },
  fileSize: { type: Number },
  progress: [fileProgressSchema],
  comments: [commentSchema]
});

/* ===========================
   VIDEO PROGRESS PER PARALEGAL
=========================== */
const videoProgressSchema = new mongoose.Schema({
  paralegalId: { type: mongoose.Schema.Types.ObjectId, ref: "Paralegal", required: true },
  percentageWatched: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

/* ===========================
   VIDEO SCHEMA
=========================== */
const videoSchema = new mongoose.Schema({
  isUrl: { type: Boolean, default: false },
  url: { type: String },
  filePath: { type: String },
  s3Url: { type: String },
  originalFileName: { type: String },
  fileType: { type: String },
  fileSize: { type: Number },
  progress: [videoProgressSchema],
  comments: [commentSchema]
});

/* ===========================
   MAIN TRAINING DOCUMENT
=========================== */
const trainingDocumentSchema = new mongoose.Schema(
  {
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
    assignedParalegals: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Paralegal" }
    ],
    priority: {
      type: String,
      required: true,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    description: { type: String },
    files: [fileSchema],
    videos: [videoSchema],
    uploadedBy: { type: String },
    uploadedById: { type: mongoose.Schema.Types.ObjectId, refPath: 'uploadedByModel' },
    uploadedByModel: { type: String, enum: ['Attorney', 'Paralegal'] },
    status: {
      type: String,
      enum: ['Pending Review', 'In Training', 'Completed'],
      default: 'Pending Review',
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrainingDocument", trainingDocumentSchema);