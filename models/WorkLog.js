// models/WorkLog.js
const mongoose = require('mongoose');

const workLogSchema = new mongoose.Schema({
  paralegal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paralegal',
    required: true
  },
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  activityType: {
    type: String,
    enum: [
      'Research', 'Drafting', 'Review', 'Filing', 'Communication',
      'Meeting', 'Administrative', 'Other'
    ],
    required: true
  },
  description: {
    type: String,
    required: true
  },
  billable: {
    type: Boolean,
    default: true
  },
  hourlyRate: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Draft', 'Submitted', 'Approved', 'Rejected', 'Invoiced'],
    default: 'Draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attorney'
  },
  approvedAt: Date,
  rejectionReason: String,
  attachments: [{
    name: String,
    url: String
  }]
}, {
  timestamps: true
});

// Calculate duration and amount
workLogSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
    if (this.billable && this.hourlyRate) {
      this.amount = (this.duration / 60) * this.hourlyRate;
    }
  }
  next();
});

// Indexes
workLogSchema.index({ paralegal: 1, date: -1 });
workLogSchema.index({ case: 1, status: 1 });

module.exports = mongoose.model('WorkLog', workLogSchema);
