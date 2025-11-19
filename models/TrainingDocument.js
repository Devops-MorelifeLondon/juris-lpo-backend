const mongoose = require('mongoose');

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

  filePath: { type: String, required: true },   // S3 key
  s3Url: { type: String },                      // Optional
  originalFileName: { type: String, required: true },
  fileType: { type: String },
  fileSize: { type: Number },

  uploadedBy: { type: String },
  uploadedById: { type: mongoose.Schema.Types.ObjectId },
  uploadedByModel: { type: String },

  status: {
    type: String,
    enum: ['Pending Review', 'In Training', 'Completed'],
    default: 'Pending Review',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('TrainingDocument', trainingDocumentSchema);
