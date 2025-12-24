const Task = require('../models/Task');
const TimeEntry = require('../models/TimeEntry');


exports.getTasks = async (req, res) => {
  try {
    const { status, priority, domain, page = 1, limit = 10, search } = req.query;
    
    // 1. Build Query
    let query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (domain) query.domain = domain;
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    // 2. Pagination Logic
    const skip = (page - 1) * limit;

    // 3. Execute Query
    const tasks = await Task.find(query)
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      count: tasks.length,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      totalTasks: total,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single task details
 * @route   GET /api/admin/tasks/:id
 */
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedBy', 'fullName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!task) return res.status(404).json({ message: "Task not found" });

    res.status(200).json({ success: true, data: task });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get detailed logs/time entries for a specific task
 * @route   GET /api/admin/tasks/:id/logs
 */
exports.getTaskLogs = async (req, res) => {
  try {
    const logs = await TimeEntry.find({ task: req.params.id })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};