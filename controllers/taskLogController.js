// controllers/taskLogController.js
const Task = require("../models/Task");
const TaskLog = require("../models/TaskLog");
const Notification = require("../models/Notification");

exports.getTaskLogs = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role; // 👈 Make sure your auth middleware adds role too

    // Verify task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Authorization: user must be assigned or assigner
    const isAuthorized =
      task.assignedTo?._id?.toString() === userId.toString() ||
      task.assignedBy?._id?.toString() === userId.toString();

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Access denied to task logs"
      });
    }

    // Fetch logs for this task
    const taskLogs = await TaskLog.find({ task: taskId })
      .populate({
        path: 'performedBy',
        select: 'firstName lastName fullName email'
      })
      .sort({ createdAt: -1 });

    // Calculate total hours
    const totalHours = taskLogs.reduce((sum, log) => sum + (log.hoursSpent || 0), 0);

    // 🧠 Add isAuthorizedToEdit field for each log
    const enrichedLogs = taskLogs.map(log => {
      let canEdit = false;

      // Rule 1: The one who created the log can edit it
      if (log.performedBy?._id?.toString() === userId.toString()) {
        canEdit = true;
      }

      // Rule 2: If the user is an attorney who assigned this task, allow edit
      else if (
        userRole === 'Attorney' &&
        task.assignedBy?._id?.toString() === userId.toString()
      ) {
        canEdit = true;
      }

      // Rule 3: Admins (if any) can edit everything
      else if (userRole === 'Admin') {
        canEdit = true;
      }

      return {
        ...log.toObject(),
        isAuthorizedToEdit: canEdit
      };
    });

    res.status(200).json({
      success: true,
      data: enrichedLogs,
      totalHours
    });

  } catch (error) {
    console.error('Error fetching task logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task logs'
    });
  }
};


exports.createTaskLog = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, type, hoursSpent, status } = req.body;
    const userId = req.user._id;
   

    // Validate required fields
    if (!title || !description || !type || hoursSpent === undefined || hoursSpent < 0) {
      return res.status(400).json({
        success: false,
        message: "Title, description, type, and valid hoursSpent are required"
      });
    }

    // Verify task exists and user has access
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const isAuthorized =
      task.assignedTo?._id?.toString() === userId.toString() ||
      task.assignedBy?._id?.toString() === userId.toString();

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: "Not authorized to add logs to this task" });
    }

    // Create log entry
    const taskLog = new TaskLog({
      task: taskId,
      title,
      description,
      type,
      hoursSpent: parseFloat(hoursSpent),
      performedBy: userId,
      performedByModel: req.user.role == 'attorney' ? 'Attorney' : 'Paralegal',
      status: status || 'Draft'
    });

    const savedLog = await taskLog.save();
    await savedLog.populate('performedBy', 'firstName lastName fullName email');

    // Update parent task's total hours
    await Task.findByIdAndUpdate(taskId, {
      $inc: { actualHoursSpent: parseFloat(hoursSpent) }
    });

    try {
      await Notification.create({
        recipient: req.user.role == 'attorney' ? task.assignedTo._id : task.assignedBy._id,
        recipientModel: req.user.role == 'attorney' ?  'Paralegal'  : 'Attorney',
        type: 'work_log_added',
        task: task._id,
        message: `New Work Log is added to ${task.title}`
      });
      console.log('🔔 Attorney notification created');
    } catch (notifError) {
      console.error('❌ Failed to create attorney notification:', notifError.message);
    }

    res.status(201).json({
      success: true,
      data: savedLog
    });
  } catch (error) {
    console.error('Error creating task log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task log'
    });
  }
};

exports.updateTaskLog = async (req, res) => {
  try {
    const { taskId, logId } = req.params;
    const { title, description, type, hoursSpent, status } = req.body;
    const userId = req.user._id;

    // Find existing log
    const taskLog = await TaskLog.findById(logId);
    if (!taskLog) {
      return res.status(404).json({ success: false, message: "Task log not found" });
    }

    // Verify it belongs to this task and user is the performer
    if (taskLog.task.toString() !== taskId || taskLog.performedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this log" });
    }

    // Calculate hours difference for task update
    const oldHours = taskLog.hoursSpent;
    const newHours = parseFloat(hoursSpent) || oldHours;
    const hoursDiff = newHours - oldHours;

    // Update log
    const updatedLog = await TaskLog.findByIdAndUpdate(
      logId,
      {
        title,
        description,
        type,
        hoursSpent: newHours,
        status
      },
      { new: true, runValidators: true }
    );

    // Adjust parent task's total hours
    await Task.findByIdAndUpdate(taskId, { $inc: { actualHoursSpent: hoursDiff } });

    await updatedLog.populate('performedBy', 'firstName lastName fullName email');

    res.status(200).json({
      success: true,
      data: updatedLog
    });
  } catch (error) {
    console.error('Error updating task log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task log'
    });
  }
};

exports.deleteTaskLog = async (req, res) => {
  try {
    const { taskId, logId } = req.params;
    const userId = req.user._id;

    // Find and verify log
    const taskLog = await TaskLog.findById(logId);
    if (!taskLog) {
      return res.status(404).json({ success: false, message: "Task log not found" });
    }

    if (taskLog.task.toString() !== taskId || taskLog.performedBy.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this log" });
    }

    // Subtract hours from parent task before deletion
    await Task.findByIdAndUpdate(taskId, {
      $inc: { actualHoursSpent: -taskLog.hoursSpent }
    });

    await TaskLog.findByIdAndDelete(logId);

    res.status(200).json({
      success: true,
      message: "Task log deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting task log:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task log'
    });
  }
};
