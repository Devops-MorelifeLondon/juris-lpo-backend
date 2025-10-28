const Notification = require("../models/Notification");
const mongoose = require('mongoose');

// Get all notifications for the authenticated user
exports.getNotifications = async (req, res) => {
  try {

    const userId = req.user._id;


    const notifications = await Notification.find({ 
      recipient: userId
    })
    .sort({ createdAt: -1 }) // Most recent first
    .select('-__v') // Exclude MongoDB version field
    .lean(); // Optimize for read-only queries



    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.status(200).json({
      success: true, 
      data: notifications,
      count: notifications.length,
      unreadCount: unreadCount
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Mark a specific notification as read
exports.markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
  
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format'
      });
    }

    // Check if notification belongs to user and update
    const updatedNotification = await Notification.findOneAndUpdate(
      { 
        _id: notificationId,
        recipient: req.user._id,
        isRead: false // Only update if not already read
      },
      { 
        isRead: true,
        updatedAt: new Date()
      },
      { 
        new: true, // Return updated document
        runValidators: true,
        select: '-__v'
      }
    );

    if (!updatedNotification) {
      // Check if notification exists but already read or belongs to another user
      const notification = await Notification.findOne({ 
        _id: notificationId,
        recipient: req.user._id 
      });

      if (!notification) {
        return res.status(404).json({
          success: false,
          message: 'Notification not found or access denied'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Notification already read',
        data: notification
      });
    }


    res.status(200).json({
      success: true,
      message: 'Notification marked as read successfully',
      data: updatedNotification
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};
