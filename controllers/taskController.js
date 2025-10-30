const Task = require('../models/Task');
const Case = require('../models/Case');
const Paralegal = require('../models/Paralegal');
const { attorneyTaskCreatedTemplate, paralegalTaskAvailableTemplate } = require('../lib/emailTemplates');
const { sendBrevoEmailApi } = require('../lib/emailBrevoSdk');
const Notification = require('../models/Notification');

// @desc    Get all tasks with filters
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { caseId, status, priority, assignedTo, type, search, page = 1, limit = 20 } = req.query;
    const query = {};

    // Build filter query
    if (caseId) query.case = caseId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (type) query.type = type;
    if(req.user.role == "paralegal"){
      query.assignedTo = req.user._id;
    }else{
      query.assignedBy = req.user._id;
    }

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

  

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Task.countDocuments(query);

    const tasks = await Task.find(query)
      .populate('case', 'name caseNumber serviceType status')
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ dueDate: 1, priority: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: tasks
    });
  } catch (error) {
    console.error('❌ Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks',
      error: error.message
    });
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('case', 'name caseNumber serviceType status client deadline')
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Authorization check
    const isAssignedBy = task.assignedBy && task.assignedBy._id.toString() === req.user._id.toString();
    const isAssignedTo = task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString();

    if (!isAssignedBy && !isAssignedTo) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this task'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('❌ Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task',
      error: error.message
    });
  }
};

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      type,
      priority,
      dueDate,
      estimatedHours,
      checklistItems,
      notes,
      domain,
      tags
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, type, and due date'
      });
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      assignedBy: req.user._id,
      type,
      priority: priority || 'Medium',
      dueDate: new Date(dueDate),
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      checklistItems: checklistItems || [],
      notes,
      domain,
      tags: tags || []
    });

    // Populate task details
    const populatedTask = await Task.findById(task._id)
      .populate('case', 'name caseNumber')
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'firstName lastName email');

    console.log('✅ Task created:', task._id);

    // === NOTIFICATION SYSTEM ===

    // 1. Send confirmation email to attorney
    try {
      const attorneyEmailData = {
        _id: task._id,
        title,
        type,
        priority: priority || 'Medium',
        dueDate,
        estimatedHours
      };

      const attorneyFullName = `${req.user.fullName}`;
      
      await sendBrevoEmailApi({
        to_email: [{ email: req.user.email, name: attorneyFullName }],
        email_subject: '✅ Task Created Successfully - Juris-LPO',
        htmlContent: attorneyTaskCreatedTemplate(attorneyFullName, attorneyEmailData)
      });

      console.log('📧 Attorney confirmation email sent to:', req.user.email);

    } catch (emailError) {
      console.error('❌ Failed to send attorney email:', emailError.message);
      // Don't fail the whole operation if email fails
    }

    // 2. Create in-app notification for attorney
    try {
      await Notification.create({
        recipient: req.user._id,
        recipientModel: 'Attorney',
        type: 'task_created',
        task: task._id,
        message: `Your task "${title}" has been created and broadcasted to all paralegals.`
      });
      console.log('🔔 Attorney notification created');
    } catch (notifError) {
      console.error('❌ Failed to create attorney notification:', notifError.message);
    }

    // 3. Fetch all verified and active paralegals
    const allParalegals = await Paralegal.find({ 
    }).select('_id firstName lastName email');

    console.log(`📊 Found ${allParalegals.length} available paralegals`);

    if (allParalegals.length === 0) {
      console.log('⚠️ No available paralegals found');
      return res.status(201).json({
        success: true,
        message: 'Task created successfully, but no paralegals are currently available',
        data: populatedTask,
        notificationsSent: 0
      });
    }

    // 4. Create in-app notifications for all paralegals
    try {
      const paralegalNotifications = allParalegals.map(paralegal => ({
        recipient: paralegal._id,
        recipientModel: 'Paralegal',
        type: 'task_created',
        task: task._id,
        message: `New task available: "${title}" - ${priority || 'Medium'} priority, due ${new Date(dueDate).toLocaleDateString('en-IN')}`
      }));

      await Notification.insertMany(paralegalNotifications);
      console.log(`🔔 Created ${paralegalNotifications.length} paralegal notifications`);
    } catch (notifError) {
      console.error('❌ Failed to create paralegal notifications:', notifError.message);
    }

    // 5. Send emails to all paralegals
    const paralegalEmailData = {
      _id: task._id,
      title,
      description,
      type,
      priority: priority || 'Medium',
      dueDate,
      estimatedHours,
      assignedByName: `${req.user.fullName}`
    };

    let emailsSentCount = 0;
    let emailsFailedCount = 0;

    // Send emails in batches to avoid overwhelming the API
    const batchSize = 50; // Brevo typically allows batch sending
    
    for (let i = 0; i < allParalegals.length; i += batchSize) {
      const batch = allParalegals.slice(i, i + batchSize);
      
      // Prepare recipient list for this batch
      const recipients = batch.map(p => ({
        email: p.email,
        name: `${p.firstName} ${p.lastName}`
      })).filter(d => d.email != 'ritz@jurislpo.com');
      console.log(recipients);

      // Send to each paralegal individually for personalization
      const emailPromises = recipients.map(async (recipient) => {
        try {
          await sendBrevoEmailApi({
            to_email: [recipient],
            email_subject: '🔔 New Task Available - Juris-LPO',
            htmlContent: paralegalTaskAvailableTemplate(recipient.name, paralegalEmailData)
          });
          emailsSentCount++;
          console.log(`✅ Email sent to: ${recipient.email}`);
        } catch (error) {
          emailsFailedCount++;
          console.error(`❌ Failed to send email to ${recipient.email}:`, error.message);
        }
      });

      // Wait for this batch to complete before moving to next
      await Promise.allSettled(emailPromises);
    }

    console.log(`📧 Email Summary - Sent: ${emailsSentCount}, Failed: ${emailsFailedCount}`);

    res.status(201).json({
      success: true,
      message: `Task created successfully and broadcasted to ${allParalegals.length} paralegals`,
      data: populatedTask,
      notifications: {
        total: allParalegals.length,
        emailsSent: emailsSentCount,
        emailsFailed: emailsFailedCount
      }
    });

  } catch (error) {
    console.error('❌ Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task',
      error: error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    // Clean empty strings for optional fields
    if (req.body.case === '') {
      delete req.body.case;
    }
    if (req.body.assignedTo === '') {
      delete req.body.assignedTo;
    }

    // Handle demo paralegal: Map assignedTo string to demoAssignedTo and remove original to avoid cast error
    if (req.body.assignedTo !== undefined) {
      req.body.demoAssignedTo = req.body.assignedTo;
      delete req.body.assignedTo; // Always delete to prevent ObjectId cast on string name
    }

    // Find task first for auth and existence check
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Authorization check (demo: isAssignedTo will be false unless real ObjectId is used)
    const isAssignedBy = task.assignedBy.toString() === req.user._id.toString();
    const isAssignedTo = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

    if (!isAssignedBy && !isAssignedTo) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this task'
      });
    }

    // Paralegals can only update specific fields (applies to both demo and real)
    if (req.user.role === 'paralegal') {
      const allowedFields = ['status', 'actualHoursSpent', 'notes', 'checklistItems'];
      const updates = Object.keys(req.body).filter(key => !['demoAssignedTo'].includes(key)); // Exclude demo field from restriction
      const isValidOperation = updates.every(update => allowedFields.includes(update));

      if (!isValidOperation) {
        return res.status(403).json({
          success: false,
          message: 'You can only update status, hours, notes, and checklist items'
        });
      }
    }

    // Update timestamps based on status
    if (req.body.status === 'Completed' && task.status !== 'Completed') {
      req.body.completedDate = new Date();
    }

    if (req.body.status === 'In Progress' && !task.startDate) {
      req.body.startDate = new Date();
    }

    // Verify case if provided (consolidated check)
    if (req.body.case) {
      const caseExists = await Case.findById(req.body.case);
      if (!caseExists) {
        return res.status(404).json({
          success: false,
          message: 'Case not found'
        });
      }

      // Check user access to case (for attorneys)
      if (req.user.role === 'attorney' && caseExists.attorney.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this case'
        });
      }
    }

    // For demo paralegals, no verification needed - full name is stored directly
    // Future: If real assignedTo (ObjectId) is to be supported, add validation here:
    // if (req.body.assignedTo) { ... Paralegal.findById check ... }

    // Cast types for Mongoose (e.g., dueDate, estimatedHours)
    if (req.body.dueDate) {
      req.body.dueDate = new Date(req.body.dueDate);
    }
    if (req.body.estimatedHours !== undefined) {
      req.body.estimatedHours = Number(req.body.estimatedHours);
    }
    if (req.body.actualHoursSpent !== undefined) {
      req.body.actualHoursSpent = Number(req.body.actualHoursSpent);
    }

    // Update task
    task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('case', 'name caseNumber serviceType')
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'fullName email'); // Null for demo, but demoAssignedTo is direct

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    console.error('❌ Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task',
      error: error.message
    });
  }
};



// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Only task creator can delete
    if (task.assignedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task'
        });
    }

    await task.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('❌ Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task',
      error: error.message
    });
  }
};

// @desc    Update task checklist item
// @route   PATCH /api/tasks/:id/checklist/:itemId
// @access  Private
exports.updateChecklistItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { completed } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const checklistItem = task.checklistItems.id(itemId);

    if (!checklistItem) {
      return res.status(404).json({
        success: false,
        message: 'Checklist item not found'
      });
    }

    checklistItem.completed = completed;
    if (completed) {
      checklistItem.completedAt = new Date();
    } else {
      checklistItem.completedAt = undefined;
    }

    await task.save();

    res.status(200).json({
      success: true,
      message: 'Checklist item updated',
      data: task
    });
  } catch (error) {
    console.error('❌ Update checklist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update checklist item',
      error: error.message
    });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
exports.getTaskStats = async (req, res) => {
  try {
    const query = req.user.role === 'attorney' 
      ? { assignedBy: req.user._id }
      : { assignedTo: req.user._id };

    const stats = await Task.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$actualHoursSpent' }
        }
      }
    ]);

    const overdueTasks = await Task.countDocuments({
      ...query,
      dueDate: { $lt: new Date() },
      status: { $nin: ['Completed', 'Cancelled'] }
    });

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        overdue: overdueTasks
      }
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};



// controllers/taskController.js

exports.acceptTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    
    // Find task
    const task = await Task.findById(taskId).populate('assignedBy', 'firstName lastName email');
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if already assigned (FCFS logic)
    if (task.assignedTo) {
      return res.status(400).json({
        success: false,
        message: 'This task has already been accepted by another paralegal',
        alreadyAssigned: true
      });
    }

    // Check if task is still available
    if (task.status === 'Completed' || task.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `This task has been ${task.status.toLowerCase()}`
      });
    }

    // Assign task to current paralegal
    task.assignedTo = req.user._id;
    task.status = 'In Progress';
    task.startDate = new Date();
    await task.save();

    // Update paralegal's active cases count
    await Paralegal.findByIdAndUpdate(req.user._id, {
      $inc: { currentActiveCases: 1 }
    });

    console.log(`✅ Task ${taskId} accepted by paralegal ${req.user._id}`);

    // Create notification for attorney
    try {
      await Notification.create({
        recipient: task.assignedBy._id,
        recipientModel: 'Attorney',
        type: 'task_accepted',
        task: task._id,
        message: `Task "${task.title}" has been accepted by ${req.user.firstName} ${req.user.lastName}`
      });
      console.log('🔔 Attorney notification created for task acceptance');
    } catch (notifError) {
      console.error('❌ Failed to create attorney notification:', notifError.message);
    }

    // Send email to attorney
    try {
      const attorneyFullName = `${task.assignedBy.firstName} ${task.assignedBy.lastName}`;
      const paralegalFullName = `${req.user.firstName} ${req.user.lastName}`;

      const attorneyNotificationHtml = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Task Accepted</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f3f4f6; padding: 40px 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: #ffffff; font-size: 28px; margin: 0;">✅ Task Accepted</h1>
          </div>
          <div style="padding: 32px 24px;">
            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Dear ${attorneyFullName},</p>
            <p style="font-size: 15px; color: #374151; line-height: 1.6;">Good news! Your task <strong>"${task.title}"</strong> has been accepted by <strong>${paralegalFullName}</strong>.</p>
            <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; margin: 24px 0; border-radius: 4px;">
              <p style="margin: 0; color: #166534; font-size: 14px;">The paralegal will begin working on this task shortly. You can track progress in your dashboard.</p>
            </div>
            <div style="margin: 32px 0; text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/attorney/tasks/${task._id}" style="background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">View Task Details</a>
            </div>
          </div>
        </div>
      </body>
      </html>`;

      await sendBrevoEmailApi({
        to_email: [{ 
          email: task.assignedBy.email, 
          name: attorneyFullName 
        }],
        email_subject: '✅ Task Accepted - Juris-LPO',
        htmlContent: attorneyNotificationHtml
      });

      console.log('📧 Attorney notification email sent');
    } catch (emailError) {
      console.error('❌ Failed to send attorney notification email:', emailError.message);
    }

    // Populate and return updated task
    const updatedTask = await Task.findById(task._id)
      .populate('case', 'name caseNumber')
      .populate('assignedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Task accepted successfully',
      data: updatedTask
    });

  } catch (error) {
    console.error('❌ Accept task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept task',
      error: error.message
    });
  }
};

// Get available tasks for paralegals
exports.getAvailableTasks = async (req, res) => {
  try {
    const { type, priority, page = 1, limit = 20 } = req.query;

    const query = {
      assignedTo: null, // Only unassigned tasks
      status: 'Not Started',
      dueDate: { $gte: new Date() } // Only future tasks
    };

    if (type) query.type = type;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('assignedBy', 'firstName lastName email')
      .populate('case', 'name caseNumber')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      data: tasks,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalTasks: total,
        tasksPerPage: tasks.length
      }
    });
  } catch (error) {
    console.error('❌ Get available tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available tasks',
      error: error.message
    });
  }
};


// controllers/taskController.js - Add this method
exports.updateChecklist = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { checklistItems } = req.body;
    const userId = req.user._id;

    // Find task
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ 
        success: false, 
        message: "Task not found" 
      });
    }

    // Authorization: Only paralegal assigned to the task can update checklist
    const isAuthorized = task.assignedTo?._id?.toString() === userId.toString();
    
    if (!isAuthorized) {
      return res.status(403).json({ 
        success: false, 
        message: "Only assigned paralegal can update checklist" 
      });
    }

    // Validate checklist items
    if (!Array.isArray(checklistItems)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid checklist format" 
      });
    }

    // Update only checklistItems field
    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { 
        checklistItems,
        updatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true,
        select: 'checklistItems title status assignedTo' // Only return relevant fields
      }
    );

    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update checklist' 
    });
  }
};
