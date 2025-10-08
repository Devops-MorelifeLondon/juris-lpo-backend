// models/Task.js
const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attorney',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paralegal',
    required: true
  },
  type: {
    type: String,
    enum: ['Drafting', 'Research', 'Review', 'Filing', 'Communication', 'Administrative', 'Other'],
    required: true
  },
  status: {
    type: String,
    enum: ['Not Started', 'In Progress', 'Blocked', 'Completed', 'Cancelled'],
    default: 'Not Started'
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
  startDate: Date,
  completedDate: Date,
  estimatedHours: Number,
  actualHoursSpent: {
    type: Number,
    default: 0
  },
  checklistItems: [{
    text: String,
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  attachments: [{
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String
}, {
  timestamps: true
});

// Indexes
taskSchema.index({ case: 1, status: 1 });
taskSchema.index({ assignedTo: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
