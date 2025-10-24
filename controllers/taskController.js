const Task = require('../models/Task');
const Case = require('../models/Case');
const Paralegal = require('../models/Paralegal');

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
      .populate('assignedTo', 'fullName email');

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
      tags
    } = req.body;



    // Validate required fields
    if (!title || !description || !type || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, type, and due date'
      });
    }

 

    // Create task with parsed fields
    const task = await Task.create({
      title,
      description,
      assignedBy: req.user._id,
      type,
      priority: priority || 'Medium',
      dueDate: new Date(dueDate), // Parse string to Date
      estimatedHours: estimatedHours ? Number(estimatedHours) : undefined,
      checklistItems: checklistItems || [],
      notes,
      tags: tags || []
    });

    // Populate and return (note: demoAssignedTo is not populated, display directly)
    const populatedTask = await Task.findById(task._id)
      .populate('case', 'name caseNumber')
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'fullName email'); // This will be null for demo

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
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
