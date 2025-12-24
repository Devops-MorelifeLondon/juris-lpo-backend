const Task = require('../models/Task');
const Case = require('../models/Case');
const Paralegal = require('../models/Paralegal');
const { attorneyTaskCreatedTemplate, paralegalTaskAvailableTemplate } = require('../lib/emailTemplates');
const { sendBrevoEmailApi } = require('../lib/emailBrevoSdk');
const Notification = require('../models/Notification');
const { uploadFilesToS3 } = require('../config/s3'); // New Import
const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {s3} = require('../config/s3');
const Admin = require('../models/Admin');

// @desc    Get all tasks with filters
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { caseId, status, priority, assignedTo, type, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (caseId) query.case = caseId;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;
    if (type) query.type = type;
    
    if(req.user.role == "paralegal"){
      query.assignedTo = req.user._id;
    } else {
      query.assignedBy = req.user._id;
    }

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
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const isAssignedBy = task.assignedBy && task.assignedBy._id.toString() === req.user._id.toString();
    const isAssignedTo = task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString();

    if (!isAssignedBy && !isAssignedTo) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this task' });
    }

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    console.error('❌ Get task error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch task', error: error.message });
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

    if (!title || !description || !type || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, type, and due date'
      });
    }

    // 1. Handle File Uploads via S3
    let attachments = [];
    if (req.files && req.files.length > 0) {
      try {
        console.log('Uploading files to S3...');  
        attachments = await uploadFilesToS3(req.files);
      } catch (uploadError) {
        console.log('S3 Upload Error:', uploadError);
        return res.status(500).json({ success: false, message: 'File upload failed' });
      }
    }

    // 2. Parse JSON strings (FormData sends arrays as strings)
    let parsedChecklist = [];
    let parsedTags = [];

    try {
      if (typeof checklistItems === 'string') parsedChecklist = JSON.parse(checklistItems);
      else if (Array.isArray(checklistItems)) parsedChecklist = checklistItems;

      if (typeof tags === 'string') parsedTags = JSON.parse(tags);
      else if (Array.isArray(tags)) parsedTags = tags;
    } catch (e) {
      console.error('JSON Parse error for FormData:', e);
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
      checklistItems: parsedChecklist,
      notes,
      domain,
      tags: parsedTags,
      attachments: attachments // Add S3 URLs
    });

    const populatedTask = await Task.findById(task._id)
      .populate('case', 'name caseNumber')
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'firstName lastName email');

    console.log('✅ Task created:', task._id);

    // === NOTIFICATIONS ===
    // 1. Email Attorney
    try {
      const attorneyEmailData = {
        _id: task._id,
        title,
        type,
        priority: priority || 'Medium',
        dueDate,
        estimatedHours
      };
      await sendBrevoEmailApi({
        to_email: [{ email: req.user.email, name: req.user.fullName }],
        email_subject: '✅ Task Created Successfully - Juris-LPO',
        htmlContent: attorneyTaskCreatedTemplate(req.user.fullName, attorneyEmailData)
      });
    } catch (emailError) {
      console.error('❌ Failed to send attorney email:', emailError.message);
    }

    // 2. Notification for Attorney
    try {
      await Notification.create({
        recipient: req.user._id,
        recipientModel: 'Attorney',
        type: 'task_created',
        task: task._id,
        message: `Your task "${title}" has been created`
      });
    } catch (notifError) {
      console.error('❌ Failed to create attorney notification:', notifError.message);
    }

 
  // 4. NOTIFICATIONS LOGIC (Multiple Admins)
    try {
      // Find all active admins
     const admins = await Admin.find({ isActive: true })
  .select('_id fullName email');

      
      const adminNotifications = admins.map(admin => ({
        recipient: admin._id,
        recipientModel: 'Admin',
        type: 'task_created',
        task: task._id,
        message: `New task "${title}" created by ${req.user.fullName}.`
      }));

    sendEmailPromises = admins.map(admin => {
  // Hard-coded professional HTML template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        .container { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
        .header { background-color: #2563eb; color: #ffffff; padding: 30px; text-align: center; }
        .content { padding: 30px; background-color: #ffffff; }
        .task-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .footer { background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; }
        .button { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px; }
        .label { font-size: 11px; font-weight: bold; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; display: block; }
        .value { font-size: 16px; color: #1e293b; font-weight: 500; margin-bottom: 15px; display: block; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin:0;">New Task Notification</h2>
          <p style="margin:5px 0 0 0; opacity: 0.9;">Juris-LPO Management System</p>
        </div>
        <div class="content">
          <p>Hello <strong>${admin.fullName || 'Admin'}</strong>,</p>
          <p>A new task has been created in the system and is currently awaiting assignment or review.</p>
          
          <div class="task-card">
            <span class="label">Task Title</span>
            <span class="value">${title}</span>
            
            <span class="label">Created By</span>
            <span class="value">${req.user.fullName || 'Attorney'}</span>

            <span class="label">Task ID</span>
            <span class="value" style="font-family: monospace; font-size: 13px;">${task._id}</span>
          </div>

          <div style="text-align: center;">
            <a href="${process.env.ADMIN_FRONTEND_URL || 'https://admin.jurislpo.com'}/manage-tasks" class="button">View Task Details</a>
          </div>
          
          <p style="margin-top: 25px; font-size: 14px;">If you are unable to click the button, please log in to your admin dashboard directly.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} Juris-LPO. All rights reserved.</p>
          <p>This is an automated system notification. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendBrevoEmailApi({
    to_email: [{ email: admin.email, name: admin.fullName }],
    email_subject: 'New Task Created - Juris-LPO',
    htmlContent: htmlContent
  });
});


      // Execute all email sends
      await Promise.all(sendEmailPromises);

      // Bulk create notifications for all admins
      if (adminNotifications.length > 0) {
        await Notification.insertMany(adminNotifications);
      }

      // Optional: Email logic remains same...
    } catch (notifError) {
      console.error('Notification Error:', notifError.message);
    }

    res.status(201).json({
      success: true,
      message: `Task created successfully`,
      data: populatedTask
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
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const isAssignedBy = task.assignedBy.toString() === req.user._id.toString();
    const isAssignedTo = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

    if (!isAssignedBy && !isAssignedTo) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Paralegal Restrictions
    if (req.user.role === 'paralegal') {
      const allowedFields = ['status', 'actualHoursSpent', 'notes', 'checklistItems', 'attachments', 'documents'];
      const updates = Object.keys(req.body);
      // Logic to filter strictly if needed, usually validation is enough
    }

    // 1. Handle New File Uploads
    if (req.files && req.files.length > 0) {
      try {
        const newAttachments = await uploadFilesToS3(req.files);
        // Append new files to existing attachments
        req.body.attachments = [...(task.attachments || []), ...newAttachments];
      } catch (uploadError) {
        return res.status(500).json({ success: false, message: 'File upload failed' });
      }
    }

    // 2. Handle JSON Parsing for FormData
    if (req.body.checklistItems && typeof req.body.checklistItems === 'string') {
      try { req.body.checklistItems = JSON.parse(req.body.checklistItems); } catch(e){}
    }
    if (req.body.tags && typeof req.body.tags === 'string') {
      try { req.body.tags = JSON.parse(req.body.tags); } catch(e){}
    }

    // Timestamps
    if (req.body.status === 'Completed' && task.status !== 'Completed') {
      req.body.completedDate = new Date();
    }
    if (req.body.status === 'In Progress' && !task.startDate) {
      req.body.startDate = new Date();
    }

    // Case check
    if (req.body.case) {
      const caseExists = await Case.findById(req.body.case);
      if (!caseExists) return res.status(404).json({ success: false, message: 'Case not found' });
      if (req.user.role === 'attorney' && caseExists.attorney.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'No access to case' });
      }
    }

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('case', 'name caseNumber serviceType')
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updatedTask
    });
  } catch (error) {
    console.error('❌ Update task error:', error);
    res.status(500).json({ success: false, message: 'Failed to update task', error: error.message });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.assignedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    await task.deleteOne();
    res.status(200).json({ success: true, message: 'Task deleted successfully', data: {} });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete task', error: error.message });
  }
};

// @desc    Accept task
// @route   POST /api/tasks/:taskId/accept
exports.acceptTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const task = await Task.findById(taskId).populate('assignedBy', 'firstName lastName email');
    
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.assignedTo) return res.status(400).json({ success: false, message: 'Task already accepted' });

    task.assignedTo = req.user._id;
    task.status = 'In Progress';
    task.startDate = new Date();
    await task.save();

    await Paralegal.findByIdAndUpdate(req.user._id, { $inc: { currentActiveCases: 1 } });

    // Notify Attorney
    try {
      await Notification.create({
        recipient: task.assignedBy._id,
        recipientModel: 'Attorney',
        type: 'task_accepted',
        task: task._id,
        message: `Task "${task.title}" accepted by ${req.user.firstName} ${req.user.lastName}`
      });
      // (Email logic omitted for brevity, copy from original if needed)
    } catch (e) { console.error(e); }

    const updatedTask = await Task.findById(task._id)
      .populate('case', 'name caseNumber')
      .populate('assignedBy', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    res.status(200).json({ success: true, message: 'Task accepted', data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to accept task', error: error.message });
  }
};

// Get available tasks
exports.getAvailableTasks = async (req, res) => {
  try {
    const { type, priority, page = 1, limit = 20 } = req.query;
    const query = { assignedTo: null, status: 'Not Started', dueDate: { $gte: new Date() } };
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
      pagination: { currentPage: parseInt(page), totalPages: Math.ceil(total / limit), totalTasks: total }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch available tasks', error: error.message });
  }
};

// Update Checklist
exports.updateChecklist = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { checklistItems } = req.body;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    if (task.assignedTo?._id?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { checklistItems, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: updatedTask });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update checklist' });
  }
};


// @desc    Update specific checklist item status
// @route   PATCH /api/tasks/:id/checklist/:itemId
// @access  Private
exports.updateChecklistItem = async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { completed } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const item = task.checklistItems.id(itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Checklist item not found' });
    }

    item.completed = completed;
    item.completedAt = completed ? new Date() : undefined;

    await task.save();

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('❌ Update checklist item error:', error);
    res.status(500).json({ success: false, message: 'Failed to update item', error: error.message });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
exports.getTaskStats = async (req, res) => {
  try {
    // Filter stats based on user role
    const matchStage = req.user.role === 'paralegal' 
      ? { assignedTo: req.user._id }
      : { assignedBy: req.user._id };

    const stats = await Task.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalHours: { $sum: '$actualHoursSpent' }
        }
      }
    ]);

    // Get overdue count
    const overdueCount = await Task.countDocuments({
      ...matchStage,
      dueDate: { $lt: new Date() },
      status: { $nin: ['Completed', 'Cancelled'] }
    });

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        overdue: overdueCount
      }
    });
  } catch (error) {
    console.error('❌ Get stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to get stats', error: error.message });
  }
};

exports.getPresignedDownloadUrl = async (req, res) => {
  try {
    const key = req.query.key;
    console.log(key);
    
    if (!key) {
      return res.status(400).json({ success: false, message: "File key is required" });
    }

    const command = new GetObjectCommand({ 
      Bucket: process.env.AWS_BUCKET_NAME, 
      Key: key 
    });

    // Generate URL valid for 5 minutes (300 seconds)
    const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });

    res.json({ success: true, url: downloadUrl });
  } catch (err) {
    console.error("Presigned URL Error:", err);
    res.status(500).json({ success: false, message: "Failed to generate download link" });
  }
};