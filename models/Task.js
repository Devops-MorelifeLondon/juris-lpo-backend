// models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: false
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attorney', // or User
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paralegal',
    required: false // Set when accepted
  },
  domain: { 
    type: String,
    enum: [
      'Family Law', 'Personal Injury', 'Real Estate', 'Estate Planning',
      'Intellectual Property', 'Business Law', 'Immigration Services',
      'Bankruptcy', 'Criminal Law', 'Tax Law', 'Employment Law'
    ],
    required: true
  },
  type: {
    type: String,
    enum: ['Drafting', 'Research', 'Review', 'Filing', 'Communication', 'Administrative', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['Pending Assignment','To do', 'Not Started', 'In Progress','In Review', 'Blocked', 'Completed', 'Cancelled'],
    default: 'Pending Assignment'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  dueDate: {
    type: Date,
    required: true
  },
  assignedAt: {
    type: Date,
    required: false
  },
  declinedBy: [{
    paralegalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paralegal'
    },
    reason: String,
    declinedAt: Date
  }],
  startDate: Date,
  completedDate: Date,
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHoursSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  checklistItems: [{
    text: {
      type: String,
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  // ✅ Attachments Schema Updated
  attachments: [{
    name: String,
    url: String,
    key: String, // ✅ Added to store S3 Key
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  tags: [String]
}, {
  timestamps: true
});

// Indexes for performance
taskSchema.index({ assignedBy: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });
taskSchema.index({ domain: 1, status: 1, 'assignedTo': 1 }); 
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ 'domain': 1, 'status': 1, createdAt: -1 });
taskSchema.index({ assignedTo: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);