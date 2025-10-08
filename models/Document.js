// models/Document.js
const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'uploaderModel'
  },
  uploaderModel: {
    type: String,
    required: true,
    enum: ['Attorney', 'Paralegal']
  },
  type: {
    type: String,
    enum: ['Draft', 'Final', 'Review', 'Template', 'Reference', 'Evidence'],
    default: 'Draft'
  },
  category: {
    type: String,
    enum: [
      'Pleading', 'Motion', 'Contract', 'Agreement', 'Letter',
      'Brief', 'Discovery', 'Court Filing', 'Internal', 'Other'
    ]
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: String,
  mimeType: String,
  status: {
    type: String,
    enum: ['Pending', 'Under Review', 'Approved', 'Needs Revision', 'Rejected'],
    default: 'Pending'
  },
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    version: Number,
    fileUrl: String,
    uploadedAt: Date,
    changeNote: String
  }],
  sopCompliant: {
    type: Boolean,
    default: false
  },
  complianceScore: {
    type: Number,
    min: 0,
    max: 100
  },
  aiSuggestions: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attorney'
  },
  reviewedAt: Date,
  reviewComments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'reviewComments.userModel'
    },
    userModel: {
      type: String,
      enum: ['Attorney', 'Paralegal']
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String]
}, {
  timestamps: true
});

// Indexes
documentSchema.index({ case: 1, status: 1 });
documentSchema.index({ uploadedBy: 1 });

module.exports = mongoose.model('Document', documentSchema);
