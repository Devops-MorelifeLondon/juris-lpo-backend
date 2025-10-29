// utils/notificationHelper.js
const Notification = require('../models/Notification');

const sendNotification = async (recipientId, recipientModel, type, taskId, title, message, details = {}) => {
  try {
    const notification = new Notification({
      recipient: recipientId,
      recipientModel: recipientModel,
      type: type,
      task: taskId,
      title: title,
      message: message,
      ...(details.taskLog && { taskLog: details.taskLog }),
      details: details
    });

    await notification.save();
    console.log(`📧 Notification sent: ${title}`);
  } catch (error) {
    console.error('❌ Notification error:', error);
  }
};

module.exports = { sendNotification };
