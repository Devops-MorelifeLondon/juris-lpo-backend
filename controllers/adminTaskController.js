const Task = require('../models/Task');

/**
 * @desc    Get all tasks with advanced filtering
 * @route   GET /api/admin/tasks
 */
exports.getTasks = async (req, res) => {
  try {
    const { status, priority, domain } = req.query;
    let query = {};

    // Filter by status if provided (e.g., 'Pending Assignment')
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (domain) query.domain = domain;

    const tasks = await Task.find(query)
      .populate('assignedBy', 'fullName email') // Attorney who created it
      .populate('assignedTo', 'firstName lastName email') // Paralegal assigned (if any)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
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