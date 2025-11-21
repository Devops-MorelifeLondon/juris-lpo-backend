const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filePath: { type: String, required: true },
  s3Url: { type: String },
  originalFileName: { type: String, required: true },
  fileType: { type: String },
  fileSize: { type: Number }
});

const videoSchema = new mongoose.Schema({
  isUrl: { type: Boolean, default: false },  // true => external URL
  url: { type: String },                     // external link (YouTube/Vimeo/Drive)
  filePath: { type: String },                // S3 key for uploaded video
  s3Url: { type: String },
  originalFileName: { type: String },
  fileType: { type: String },
  fileSize: { type: Number },
});

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

  paralegalAssignedTo: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Paralegal' }
  ],

  priority: {
    type: String,
    required: true,
    enum: ['Low', 'Medium', 'High'],
    default: 'Low',
  },

  description: { type: String },

  // 📄 Multiple Documents
  files: [fileSchema],

  // 🎥 Multiple Videos (either URLs or uploaded files)
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
