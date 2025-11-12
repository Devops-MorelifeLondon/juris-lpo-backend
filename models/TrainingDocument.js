const mongoose = require('mongoose');

const trainingDocumentSchema = new mongoose.Schema({
  documentName: {
    type: String,
    required: true,
  },
  documentType: {
    type: String,
    required: true,
    // These values come directly from your <select> dropdown
    enum: ['AI Draft', 'Paralegal Template', 'SOP', 'Research Material', 'Other'],
  },
  assignedTo: {
    type: String,
    required: true,
    // From your "Assigned To" dropdown
    enum: ['AI', 'Paralegal', 'Both'],
  },
  priority: {
    type: String,
    required: true,
    // From your "Priority / Relevance" dropdown
    enum: ['Low', 'Medium', 'High'],
    default: 'Low',
  },
  description: {
    type: String,
  },
  filePath: {
    type: String,
    required: true, // Path on the server where the file is stored
  },
  originalFileName: {
    type: String,
    required: true, // The original name of the file
  },
  fileType: {
    type: String, // e.g., 'application/pdf'
  },
  fileSize: {
    type: Number, // in bytes
  },
  uploadedBy: {
    type: String, // You can change this to mongoose.Schema.Types.ObjectId if you link to a User
    default: 'Admin', // Placeholder
  },
  status: {
    type: String,
    // From your "Upload History" table
    enum: ['Pending Review', 'In Training', 'Completed'],
    default: 'Pending Review',
  },
}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
});

module.exports = mongoose.model('TrainingDocument', trainingDocumentSchema);