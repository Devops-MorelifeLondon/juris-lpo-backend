// models/Notification.js - Simple update
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
      // 🧩 Task notifications
      'task_created',
      'task_assigned',
      'task_accepted',
      'task_completed',
      'task_overdue',
      'task_cancelled',
      'task_declined',

      'document_assigned',

      // 💬 Message notifications
      'message_received',

      // 🕒 Work log notifications
      'work_log_added',
      'work_log_updated',
      'work_log_deleted',

      // 📅 Meeting notifications
      'meeting_scheduled',
      'meeting_updated',
      'meeting_cancelled'
    ],

    required: true
  },
  // ✅ Simple reference to the main item
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: false  // All notifications relate to a task
  },
  taskLog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskLog',
    required: false  // Only for log-specific notifications
  },
  title: {
    type: String,
    required: false,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  // ✅ Simple extra info
  details: {
    hours: Number,
    userName: String,
    action: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date
}, {
  timestamps: true
});

// Simple indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ task: 1, createdAt: -1 });
notificationSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
