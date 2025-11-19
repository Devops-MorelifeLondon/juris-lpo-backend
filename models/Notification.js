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
      'task_created', 'task_assigned', 'task_accepted', 'task_completed',
      'task_overdue', 'task_cancelled', 'task_declined',
      'document_assigned',
      'message_received',
      'work_log_added', 'work_log_updated', 'work_log_deleted',
      'meeting_scheduled', 'meeting_updated', 'meeting_cancelled' // ✅ Meeting types
    ],
    required: true
  },
  // ✅ EXISTING FIELDS
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: false
  },
  taskLog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskLog',
    required: false
  },
  // ✅ NEW FIELD (Add this to link notifications to meetings)
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: false 
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

// Indexes
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ task: 1, createdAt: -1 });
notificationSchema.index({ meeting: 1, createdAt: -1 }); // Index for meetings
notificationSchema.index({ isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);