const Task = require('../models/Task');
const Paralegal = require('../models/Paralegal');
const Notification = require('../models/Notification');
const { default: mongoose } = require('mongoose');

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

    // Step 1: Fetch eligible paralegals
    const candidates = await Paralegal.find({
      isActive: true,
      availability: { $in: ['Available Now', 'Available Soon'] },
      practiceAreas: task.domain,
      _id: { $nin: task.declinedBy.map(d => d.paralegalId) }
    })
      .select('firstName lastName practiceAreas averageRating currentActiveCases maxActiveCases hourlyRate')
      .sort({ averageRating: -1, currentActiveCases: 1 })
      .lean(); // important so we can mutate objects

    // Step 2: Attach currentTaskCount to each paralegal
    const updatedCandidates = await Promise.all(
      candidates.map(async (paralegal) => {
        const currentTaskCount = await Task.countDocuments({
          assignedTo: paralegal._id,
          status: { $in: ['To do', 'Not Started', 'In Progress', 'In Review', 'Completed'] }
        });

        return {
          ...paralegal,
          currentTaskCount
        };
      })
    );

    res.status(200).json({
      success: true,
      taskDomain: task.domain,
      count: updatedCandidates.length,
      data: updatedCandidates
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

    const currentTaskCount = await Task.countDocuments({
          assignedTo: paralegal._id,
          status: { $in: ['To do', 'Not Started', 'In Progress', 'In Review'] }
        });

    if (currentTaskCount >= paralegal.maxActiveCases) {
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

      // Start transaction for atomicity
        const session = await mongoose.startSession();
        session.startTransaction();

     // Notify attorney
          await Notification.create([{
            recipient: task.assignedBy._id,
            recipientModel: 'Attorney',
            type: 'task_assigned',
            task: task._id,
            message: `Excellent! Paralegal ${paralegal.firstName} ${paralegal.lastName} has accepted your task: "${task.title}"`,
            metadata: {
              paralegalId: paralegalId.toString(),
              paralegalName: `${paralegal.firstName} ${paralegal.lastName}`,
              domain: task.domain,
              priority: task.priority,
              estimatedHours: task.estimatedHours
            }
          }], { session });
    
          // Notify paralegal
          await Notification.create([{
            recipient: paralegalId,
            recipientModel: 'Paralegal',
            type: 'task_accepted',
            task: task._id,
            message: `Congratulations! You have assigned a new task: "${task.title}" (Priority: ${task.priority})`,
            metadata: {
              domain: task.domain,
              priority: task.priority,
              dueDate: task.dueDate.toISOString(),
              estimatedHours: task.estimatedHours,
              caseId: task.case?._id?.toString()
            }
          }], { session });
    
          // 8. Commit transaction
          await session.commitTransaction();
          session.endSession();

    res.status(200).json({
      success: true,
      message: `Task successfully assigned to ${paralegal.firstName}`,
      data: task
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


