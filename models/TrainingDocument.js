const mongoose = require('mongoose');
require('./Attorney');   
require('./Paralegal');  


/* ===========================
   REPLY SCHEMA
=========================== */
const replySchema = new mongoose.Schema({
  repliedBy: {
    firstName: { type: String },
    lastName: { type: String },
    fullName: { type: String },
    email: { type: String },
    role: { type: String, enum: ["Paralegal", "Attorney"], required: true },
    _id: { type: mongoose.Schema.Types.ObjectId, required: true }
  },
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});


/* ===========================
   COMMENT SCHEMA
=========================== */
const commentSchema = new mongoose.Schema({
  message: { type: String, required: true },
  createdBy: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    fullName: { type: String },
    email: { type: String },
    role: { type: String, enum: ['Attorney', 'Paralegal'], required: true },
    _id: { type: mongoose.Schema.Types.ObjectId, required: true }
  },
  createdAt: { type: Date, default: Date.now },
  replies: [replySchema]
});


/* ===========================
   FILE PROGRESS
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
   VIDEO PROGRESS
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
   🔥 FORMAT TEMPLATE STORAGE (NEW)
=========================== */
const formatTemplateSchema = new mongoose.Schema({
  sectPr: { type: mongoose.Schema.Types.Mixed, default: null },
  stylesXml: { type: String, default: null },
  numberingXml: { type: String, default: null },
  headers: { type: mongoose.Schema.Types.Mixed, default: null },
  footers: { type: mongoose.Schema.Types.Mixed, default: null }
}, { _id: false });


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

    // 🔥 NEW: Template Type (only for Paralegal Template)
    templateType: {
      type: String,
      required: function() {
        return this.documentType === 'Paralegal Template';
      }
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

    /* Files + Videos */
    files: [fileSchema],
    videos: [videoSchema],

    /* Uploaded By */
    uploadedBy: { type: String },
    uploadedById: { type: mongoose.Schema.Types.ObjectId, refPath: 'uploadedByModel' },
    uploadedByModel: { type: String, enum: ['Attorney', 'Paralegal'] },

    /* 🔥 AI Processing Status – FIXED ENUM */
    status: {
      type: String,
      enum: ['Pending Review', 'Processing', 'Trained', 'Failed', 'In Training', 'Completed'],
      default: 'Pending Review',
    },

    /* 🔥 Format Template Stored After DOCX Extraction */
    formatTemplate: formatTemplateSchema
  },
  { timestamps: true }
);

module.exports = mongoose.model("TrainingDocument", trainingDocumentSchema);