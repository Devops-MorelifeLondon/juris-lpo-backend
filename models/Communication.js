// models/Communication.js
const mongoose = require('mongoose');

const communicationSchema = new mongoose.Schema({
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'fromModel'
  },
  fromModel: {
    type: String,
    required: true,
    enum: ['Attorney', 'Paralegal']
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'toModel'
  },
  toModel: {
    type: String,
    required: true,
    enum: ['Attorney', 'Paralegal']
  },
  subject: String,
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Message', 'Note', 'Update', 'Question'],
    default: 'Message'
  },
  priority: {
    type: String,
    enum: ['Normal', 'High', 'Urgent'],
    default: 'Normal'
  },
  attachments: [{
    name: String,
    url: String,
    size: String
  }],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  parentMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Communication'
  }
}, {
  timestamps: true
});

// Indexes
communicationSchema.index({ case: 1, createdAt: -1 });
communicationSchema.index({ from: 1 });
communicationSchema.index({ to: 1 });

module.exports = mongoose.model('Communication', communicationSchema);
