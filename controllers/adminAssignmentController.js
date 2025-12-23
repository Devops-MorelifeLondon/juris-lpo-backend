const Task = require('../models/Task');
const Paralegal = require('../models/Paralegal');

/**
 * @desc    Get Paralegals compatible with a specific task's domain
 * @route   GET /api/admin/assign/candidates/:taskId
 */
exports.getAssignmentCandidates = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Find Paralegals who:
    // 1. Are active and available
    // 2. Have the task's domain in their practiceAreas
    // 3. Haven't already declined this specific task
    const candidates = await Paralegal.find({
      isActive: true,
      availability: { $in: ['Available Now', 'Available Soon'] },
      practiceAreas: task.domain,
      _id: { $nin: task.declinedBy.map(d => d.paralegalId) }
    })
    .select('firstName lastName practiceAreas averageRating currentActiveCases maxActiveCases hourlyRate')
    .sort({ averageRating: -1, currentActiveCases: 1 });

    res.status(200).json({
      success: true,
      taskDomain: task.domain,
      count: candidates.length,
      data: candidates
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Assign a task to a chosen Paralegal
 * @route   PATCH /api/admin/assign/:taskId
 */
exports.assignTaskToParalegal = async (req, res) => {
  try {
    const { paralegalId } = req.body;
    const { taskId } = req.params;

    if (!paralegalId) {
      return res.status(400).json({ message: "Please provide a Paralegal ID" });
    }

    // 1. Check if Paralegal is over capacity
    const paralegal = await Paralegal.findById(paralegalId);
    if (!paralegal) return res.status(404).json({ message: "Paralegal not found" });
    
    if (paralegal.currentActiveCases >= paralegal.maxActiveCases) {
      return res.status(400).json({ message: "Paralegal has reached maximum active case capacity" });
    }

    // 2. Update Task
    const task = await Task.findByIdAndUpdate(
      taskId,
      {
        assignedTo: paralegalId,
        assignedAt: new Date(),
        status: 'To do' // Moves from 'Pending Assignment' to 'To do'
      },
      { new: true, runValidators: true }
    );

    if (!task) return res.status(404).json({ message: "Task not found" });

    // 3. Increment Paralegal's active case counter
    await Paralegal.findByIdAndUpdate(paralegalId, {
      $inc: { currentActiveCases: 1 }
    });

    res.status(200).json({
      success: true,
      message: `Task successfully assigned to ${paralegal.firstName}`,
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


