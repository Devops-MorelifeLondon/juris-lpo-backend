// controllers/paralegaldashboard.js
const Task = require('../models/Task');
const Paralegal = require('../models/Paralegal');
const Notification = require('../models/Notification');
const { default: mongoose } = require('mongoose');

/**
 * Paralegal Dashboard Controller
 * COMPLETE functionality using ONLY Task model - no TaskRequest model needed
 */

// Get real-time dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const paralegalId = req.user._id;
    console.log("🟢 Paralegal ID:", paralegalId);

    // 1️⃣ Count assigned tasks
    const pendingTasks = await Task.countDocuments({
      assignedTo: paralegalId,
      status: { $in: ['To do', 'Not Started', 'In Progress', 'In Review', 'Completed'] }
    });

    // 2️⃣ Upcoming deadlines (next 7 days)
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcomingDeadlines = await Task.countDocuments({
      assignedTo: paralegalId,
      dueDate: { $gte: now, $lte: sevenDaysFromNow },
      status: { $ne: 'Completed' }
    });

    // 3️⃣ Overdue tasks
    const overdueTasksCount = await Task.countDocuments({
      assignedTo: paralegalId,
      dueDate: { $lt: now },
      status: { $ne: 'Completed' }
    });

    // 4️⃣ Paralegal profile fetch
    const paralegal = await Paralegal.findById(paralegalId)
      .select('practiceAreas specializations currentActiveCases maxActiveCases');

    if (!paralegal) {
      console.warn(`⚠️ No Paralegal document found for user: ${paralegalId}`);
      return res.status(200).json({
        pendingTasks,
        upcomingDeadlines,
        overdueTasksCount,
        availableTasksCount: 0,
        currentLoad: 0,
        maxCapacity: 0,
        availableSlots: 0,
        totalWorkload: pendingTasks,
        message: "No paralegal profile found. Please complete your profile setup."
      });
    }

    // 5️⃣ Domain + Capacity calculation
    const allowedDomains = [
      ...(paralegal.practiceAreas || []),
      ...(paralegal.specializations || [])
    ];

    const currentLoad = paralegal.currentActiveCases || 0;
    const maxCapacity = paralegal.maxActiveCases || 10;
    const availableSlots = Math.max(0, maxCapacity - currentLoad);

    // 6️⃣ Count available tasks only if capacity and domains exist
    let availableTasksCount = 0;
    if (allowedDomains.length > 0 && availableSlots > 0) {
      availableTasksCount = await Task.countDocuments({
        domain: { $in: allowedDomains },
        status: 'Pending Assignment',
        assignedTo: { $exists: false },
        'declinedBy.paralegalId': { $ne: paralegalId }
      });
    }

    // 7️⃣ Final stats
    const stats = {
      pendingTasks,
      upcomingDeadlines,
      overdueTasksCount,
      availableTasksCount,
      currentLoad,
      maxCapacity,
      availableSlots,
      totalWorkload: pendingTasks + availableTasksCount
    };

    res.status(200).json(stats);

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
};


// Get assigned tasks (tasks this paralegal is working on)
exports.getAssignedTasks = async (req, res) => {
  try {
    const paralegalId = req.user._id;
    const { limit = 5, status, priority } = req.query;
    const limitNum = parseInt(limit) || 5;

    // Build filters for assigned tasks
    const baseFilter = { assignedTo: paralegalId };
    
    if (status && Array.isArray(status)) {
      baseFilter.status = { $in: status };
    }
    
    if (priority && priority !== 'all') {
      baseFilter.priority = priority;
    }

    // Fetch assigned tasks
    const tasks = await Task.find(baseFilter)
      .populate('case', 'title caseNumber clientName')
      .populate('assignedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .lean();

    // Format for frontend
    const formattedTasks = tasks.map(task => ({
      id: task._id.toString(),
      title: task.title,
      description: task.description,
      caseName: task.case?.title || `Case ${task.case?.caseNumber || 'N/A'}`,
      caseNumber: task.case?.caseNumber || 'N/A',
      priority: task.priority.toLowerCase(),
      status: task.status.toLowerCase().replace(/\s+/g, '-'),
      type: task.type,
      domain: task.domain,
      dueDate: task.dueDate.toISOString(),
      estimatedHours: task.estimatedHours,
      actualHoursSpent: task.actualHoursSpent,
      createdAt: task.createdAt.toISOString(),
      assignedAt: task.assignedAt ? task.assignedAt.toISOString() : null,
      assignedBy: task.assignedBy ? {
        id: task.assignedBy._id.toString(),
        firstName: task.assignedBy.firstName,
        lastName: task.assignedBy.lastName,
        email: task.assignedBy.email,
        fullName: `${task.assignedBy.firstName} ${task.assignedBy.lastName}`
      } : null,
      case: task.case ? {
        id: task.case._id.toString(),
        title: task.case.title,
        caseNumber: task.case.caseNumber,
        clientName: task.case.clientName
      } : null,
      attachments: task.attachments || [],
      checklistItems: task.checklistItems || [],
      notes: task.notes || ''
    }));

    res.status(200).json({
      data: formattedTasks,
      type: 'assigned-tasks',
      count: formattedTasks.length
    });
  } catch (error) {
    console.error('Error fetching assigned tasks:', error);
    res.status(500).json({ error: 'Failed to fetch assigned tasks' });
  }
};

// Get available tasks (Pending Assignment tasks in paralegal's domains)
exports.getAvailableTasks = async (req, res) => {
  try {
   
    const paralegalId = req.user._id;
    const { limit = 10, priority, type } = req.query;
    const limitNum = parseInt(limit) || 10;

    // Get paralegal details
    const paralegal = await Paralegal.findById(paralegalId)
      .select('practiceAreas specializations currentActiveCases maxActiveCases firstName lastName');

    
    const currentLoad = paralegal.currentActiveCases || 0;
    const maxCapacity = paralegal.maxActiveCases || 10;
    const availableSlots = Math.max(0, maxCapacity - currentLoad);

    // Check capacity first
    if (availableSlots <= 0) {
      return res.status(200).json({
        data: [],
        message: `You have reached your maximum capacity (${maxCapacity} tasks). Complete some tasks before accepting new ones.`,
        capacity: { current: currentLoad, max: maxCapacity, availableSlots: 0 }
      });
    }

    const allowedDomains = [...new Set([...(paralegal.practiceAreas || []), ...(paralegal.specializations || [])])];

    // if (allowedDomains.length === 0) {
    //   return res.status(200).json({
    //     data: [],
    //     message: 'No practice areas defined. Update your profile to see available tasks.',
    //     capacity: { current: currentLoad, max: maxCapacity, availableSlots }
    //   });
    // }

    // Build filters for available tasks
    const baseFilter = {
      status: 'Pending Assignment',
      assignedTo: { $exists: false }, // Not assigned yet
      // Exclude tasks this paralegal already declined
      $or: [
        { 'declinedBy.paralegalId': { $exists: false } },
        { 'declinedBy.paralegalId': { $ne: paralegalId } }
      ]
    };

    // Additional filters
    let additionalFilter = {};
    if (priority && priority !== 'all') {
      additionalFilter.priority = priority;
    }
    if (type && type !== 'all') {
      additionalFilter.type = type;
    }

    const filter = { ...baseFilter, ...additionalFilter };

    // Fetch available tasks
    const tasks = await Task.find(filter)
      .populate('case', 'title caseNumber clientName')
      .populate('assignedBy', 'fullName email')
      .sort({ 
        priority: -1, // High priority first
        createdAt: -1 // Then most recent
      })
      .limit(limitNum)
      .lean();

    

    // Format available tasks for frontend
   const formattedTasks = tasks.map(task => ({
    _id: task._id,
  title: task.title,
  description: task.description,
  priority: task.priority?.toLowerCase(),
  type: task.type,
  domain: task.domain,
  estimatedHours: task.estimatedHours,
  dueDate: task.dueDate?.toISOString(),
  createdAt: task.createdAt?.toISOString(),
  assignedBy: task.assignedBy ? {
    id: task.assignedBy._id?.toString(),
    email: task.assignedBy.email || '',
    fullName: `${task.assignedBy.fullName}`
  } : {
    id: null,
    firstName: '',
    lastName: '',
    email: '',
    fullName: 'Unknown Attorney'
  },
  case: task.case ? {
    id: task.case._id?.toString(),
    title: task.case.title,
    caseNumber: task.case.caseNumber,
    clientName: task.case.clientName
  } : null,
  attachments: task.attachments || [],
  checklistItems: task.checklistItems || [],
  notes: task.notes || ''
}));


    res.status(200).json({
      data: formattedTasks,
      type: 'available-tasks',
      count: formattedTasks.length,
      capacity: { current: currentLoad, max: maxCapacity, availableSlots },
      matchingDomains: allowedDomains,
      filters: {
        priority,
        type,
        limit: limitNum
      }
    });
  } catch (error) {
    console.error('Error fetching available tasks:', error);
    res.status(500).json({ error: 'Failed to fetch available tasks' });
  }
};

// Accept an available task (assign to paralegal)
exports.acceptTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const paralegalId = req.user._id;

    console.log("Task Id : ", taskId);
    console.log("Paralegal Id ", paralegalId);

    // Start transaction for atomicity
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Get paralegal details
      const paralegal = await Paralegal.findById(paralegalId)
        .select('practiceAreas specializations currentActiveCases maxActiveCases firstName lastName')
        .session(session);

      if (!paralegal) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ error: 'Paralegal profile not found' });
      }

      // 2. Check capacity
      const currentLoad = paralegal.currentActiveCases || 0;
      const maxCapacity = paralegal.maxActiveCases || 10;
      const availableSlots = maxCapacity - currentLoad;

      if (availableSlots <= 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: `You have reached your maximum capacity (${maxCapacity} tasks). Please complete some tasks before accepting new ones.`,
          currentLoad,
          maxCapacity,
          availableSlots: 0
        });
      }

      // 3. Verify domain match
      const allowedDomains = [...(paralegal.practiceAreas || []), ...(paralegal.specializations || [])];
      if (allowedDomains.length === 0) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          error: 'You must define practice areas in your profile to accept tasks.'
        });
      }

      // 4. Find and lock the task
      const task = await Task.findOne({
        _id: taskId,
        domain: { $in: allowedDomains },
        status: 'Pending Assignment',
        assignedTo: { $exists: false }, // Not assigned yet
        // Ensure this paralegal hasn't declined it already
        $or: [
          { 'declinedBy.paralegalId': { $exists: false } },
          { 'declinedBy.paralegalId': { $ne: paralegalId } }
        ]
      })
        .populate('case', 'title caseNumber clientName')
        .populate('assignedBy', 'firstName lastName email')
        .session(session);

      if (!task) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({
          error: 'Task not found, already accepted by someone else, or domain mismatch. Please refresh to see latest available tasks.'
        });
      }

      // 5. Assign task to paralegal
      task.status = 'Not Started';
      task.assignedTo = paralegalId;
      task.assignedAt = new Date();

      // Remove this paralegal from declinedBy if they previously declined it
      task.declinedBy = task.declinedBy.filter(
        (decline) => decline.paralegalId.toString() !== paralegalId.toString()
      );

      await task.save({ session });

      // 6. Update paralegal capacity
      paralegal.currentActiveCases = currentLoad + 1;
      await paralegal.save({ session });

      // 7. Create notifications

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
        message: `Congratulations! You have accepted a new task: "${task.title}" (Priority: ${task.priority})`,
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

      // 9. Get populated task for response
      const populatedTask = await Task.findById(task._id)
        .populate('case', 'title caseNumber clientName')
        .populate('assignedBy', 'fullName email')
        .populate('assignedTo', 'firstName lastName email');

      console.log(`✅ Task ${taskId} accepted by paralegal ${paralegalId}. Status: Not Started`);

      res.status(200).json({
        message: `Task "${task.title}" accepted successfully! It's now assigned to you and status changed to "Not Started".`,
        taskId: task._id.toString(),
        success: true,
        data: populatedTask,
        updatedCapacity: {
          current: currentLoad + 1,
          max: maxCapacity,
          availableSlots: availableSlots - 1
        },
        action: 'accepted'
      });

    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    console.error('Error accepting task:', error);
    
    if (error.message.includes('capacity')) {
      return res.status(400).json({ error: error.message });
    } else if (error.message.includes('not found') || error.message.includes('mismatch')) {
      return res.status(404).json({ error: error.message });
    } else {
      return res.status(500).json({ 
        error: 'Failed to accept task. Please try again or contact support.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Decline an available task
exports.declineTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { reason } = req.body;
    const paralegalId = req.user._id;

    // Get paralegal details for domain verification
    const paralegal = await Paralegal.findById(paralegalId).select('practiceAreas specializations firstName lastName');
    const allowedDomains = [...(paralegal.practiceAreas || []), ...(paralegal.specializations || [])];

    if (allowedDomains.length === 0) {
      return res.status(400).json({ 
        error: 'You must define practice areas in your profile to accept/decline tasks.' 
      });
    }

    // Find the task
    const task = await Task.findOne({
      _id: taskId,
      domain: { $in: allowedDomains },
      status: 'Pending Assignment',
      assignedTo: { $exists: false }
    })
      .populate('assignedBy', 'firstName lastName email')
      .populate('case', 'title caseNumber');

    if (!task) {
      return res.status(404).json({ 
        error: 'Task not found, already accepted by someone else, or not in your domain expertise.' 
      });
    }

    // Record the decline
    task.declinedBy.push({
      paralegalId: paralegalId,
      reason: reason || 'No reason provided',
      declinedAt: new Date()
    });

    // Don't change status - task remains available for other paralegals
    await task.save();

    // === NOTIFICATIONS ===

    // Notify attorney about decline (optional - for analytics)
    await Notification.create([{
      recipient: task.assignedBy._id,
      recipientModel: 'Attorney',
      type: 'task_declined',
      task: task._id,
      message: `Paralegal ${paralegal.firstName} ${paralegal.lastName} declined your task "${task.title}". Reason: ${reason || 'No reason provided'}`,
      metadata: {
        paralegalId: paralegalId.toString(),
        paralegalName: `${paralegal.firstName} ${paralegal.lastName}`,
        domain: task.domain,
        reason: reason || 'No reason provided',
        caseNumber: task.case?.caseNumber || 'General',
        taskId: taskId
      }
    }]);

    // Optional: Notify paralegal (for record)
    await Notification.create([{
      recipient: paralegalId,
      recipientModel: 'Paralegal',
      type: 'task_declined',
      task: task._id,
      message: `You declined task "${task.title}". Reason: ${reason || 'No reason provided'}`,
      metadata: {
        domain: task.domain,
        priority: task.priority,
        caseNumber: task.case?.caseNumber || 'General',
        reason: reason || 'No reason provided'
      }
    }]);

    console.log(`❌ Task ${taskId} declined by paralegal ${paralegalId}. Reason: ${reason || 'None'}`);

    res.status(200).json({
      message: `Task "${task.title}" declined successfully. This task will remain available for other qualified paralegals.`,
      taskId: task._id.toString(),
      success: true,
      action: 'declined',
      reason: reason || null,
      data: {
        task: task,
        paralegalName: `${paralegal.firstName} ${paralegal.lastName}`,
        domain: task.domain
      }
    });

  } catch (error) {
    console.error('Error declining task:', error);
    
    if (error.message.includes('not found') || error.message.includes('mismatch')) {
      return res.status(404).json({ error: error.message });
    } else {
      return res.status(500).json({ 
        error: 'Failed to decline task. Please try again.',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// Get task history (all tasks this paralegal has interacted with)
exports.getTaskHistory = async (req, res) => {
  try {
    const paralegalId = req.user._id;
    const { limit = 20, status, type } = req.query;
    const limitNum = parseInt(limit) || 20;

    // Find all tasks this paralegal has been involved with
    const historyFilter= {
      $or: [
        { assignedTo: paralegalId }, // Assigned tasks
        { 
          status: 'Pending Assignment',
          domain: { $exists: true }, // Available tasks they might have seen
          'declinedBy.paralegalId': paralegalId // Tasks they declined
        }
      ]
    };

    if (status && status !== 'all') {
      historyFilter.status = status;
    }

    if (type && type !== 'all') {
      historyFilter.type = type;
    }

    const tasks = await Task.find(historyFilter)
      .populate('case', 'title caseNumber clientName')
      .populate('assignedBy', 'firstName lastName email')
      .sort({ updatedAt: -1 })
      .limit(limitNum)
      .lean();

    const formattedTasks = tasks.map(task => {
      const isDeclined = task.declinedBy && task.declinedBy.some((decline) => 
        decline.paralegalId.toString() === paralegalId.toString()
      );

      return {
        id: task._id.toString(),
        title: task.title,
        description: task.description,
        priority: task.priority.toLowerCase(),
        status: task.status.toLowerCase().replace(/\s+/g, '-'),
        type: task.type,
        domain: task.domain,
        dueDate: task.dueDate.toISOString(),
        createdAt: task.createdAt.toISOString(),
        assignedAt: task.assignedAt ? task.assignedAt.toISOString() : null,
        assignedBy: task.assignedBy ? {
          id: task.assignedBy._id.toString(),
          firstName: task.assignedBy.firstName,
          lastName: task.assignedBy.lastName,
          email: task.assignedBy.email,
          fullName: `${task.assignedBy.firstName} ${task.assignedBy.lastName}`
        } : null,
        case: task.case ? {
          id: task.case._id.toString(),
          title: task.case.title,
          caseNumber: task.case.caseNumber,
          clientName: task.case.clientName
        } : null,
        isAssigned: task.assignedTo?.toString() === paralegalId.toString(),
        isDeclined: isDeclined,
        declinedReason: isDeclined ? task.declinedBy.find((d) => d.paralegalId.toString() === paralegalId.toString())?.reason : null,
        declinedAt: isDeclined ? task.declinedBy.find((d) => d.paralegalId.toString() === paralegalId.toString())?.declinedAt?.toISOString() : null
      };
    });

    res.status(200).json({
      data: formattedTasks,
      type: 'task-history',
      count: formattedTasks.length
    });
  } catch (error) {
    console.error('Error fetching task history:', error);
    res.status(500).json({ error: 'Failed to fetch task history' });
  }
};
