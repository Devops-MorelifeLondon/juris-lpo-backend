// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'recipientModel',
    required: true
  },
  recipientModel: {
    type: String,
    enum: ['Attorney', 'Paralegal'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'task_created',
      'task_assigned',
      'task_accepted',
      'task_completed',
      'task_overdue',
      'task_cancelled',
      'message_received'
    ],
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: false
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientModel: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
