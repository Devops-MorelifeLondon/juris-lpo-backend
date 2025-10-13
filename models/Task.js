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
    required: false // Made optional
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attorney',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paralegal',
    required: false // Made optional
  },
  demoAssignedTo: {
    type: String,
    required: false
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
  attachments: [{
    name: String,
    url: String,
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
taskSchema.index({ case: 1, status: 1 });
taskSchema.index({ dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
