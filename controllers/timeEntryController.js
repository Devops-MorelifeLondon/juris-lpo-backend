const TimeEntry = require('../models/TimeEntry');
const Task = require('../models/Task');
const ExcelJS = require('exceljs');

// Helper to determine model name from role
const getUserModel = (role) => {
  if (role === 'attorney') return 'Attorney';
  if (role === 'paralegal') return 'Paralegal';
  return 'User';
};

exports.getTimeLogs = async (req, res) => {
  try {
    const {
      caseId,
      taskId,
      isRunning,
      assignedBy,
      isBillable,
      startDate,
      endDate,
      invoice
    } = req.query;

    const filter = {};

    /* 1. Security */
    if (req.user.role !== "attorney") {
      filter.user = req.user._id;
    }

    /* 2. Direct filters */
    if (caseId) filter.case = caseId;
    if (taskId) filter.task = taskId;

    /* 3. Boolean filters */
    if (isRunning === 'true') filter.isRunning = true;
    if (isBillable === 'true') filter.isBillable = true;

    /* 4. Invoice (unbilled) filter */
    if (invoice === 'null') {
      filter.invoice = null;
    } else if (invoice) {
      filter.invoice = invoice;
    }

    /* 5. Date range - FIXED */
    // Use createdAt because startTime becomes null when a timer stops
    if (startDate || endDate) {
      const dateRange = {};
      if (startDate) dateRange.$gte = new Date(startDate);

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }

      filter.createdAt = dateRange; 
    }

    /* 6. assignedBy → tasks → timeEntries */
    if (assignedBy) {
      // Find all tasks created by this attorney
      const attorneyTasks = await Task.find({ assignedBy })
        .select('_id')
        .lean();

      const taskIds = attorneyTasks.map(t => t._id.toString());

      if (filter.task) {
        // If a specific taskId was requested, ensure it belongs to this attorney
        if (!taskIds.includes(filter.task.toString())) {
          return res.status(200).json({ success: true, data: [] });
        }
        // If it matches, we leave filter.task as is (the specific ID)
      } else {
        // If no specific task requested, get ALL tasks for this attorney
        filter.task = { $in: taskIds };
      }
    }

    console.log("Final TimeEntry Filter:", filter);

    const logs = await TimeEntry.find(filter)
      .populate('case', 'title caseNumber')
      .populate('task', 'title status')
      .populate('user', 'firstName lastName fullName email')
      .sort({ createdAt: -1 }); // Sort by creation date usually makes more sense for logs
      console.log("Time Logs Retrieved:", logs);

    res.status(200).json({ success: true, data: logs });

  } catch (error) {
    console.error("getTimeLogs Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.startTimer = async (req, res) => {
  try {
    const { caseId, taskId, description } = req.body;
    const userId = req.user._id;
    // Get the correct model name (Capitalized) based on the JWT role
    const userModel = getUserModel(req.user.role); 

    // 1. Stop any currently running timer
    const activeTimer = await TimeEntry.findOne({ user: userId, isRunning: true });
    if (activeTimer) {
      const sessionDuration = (Date.now() - new Date(activeTimer.startTime).getTime()) / 1000;
      activeTimer.duration += sessionDuration;
      activeTimer.startTime = null;
      activeTimer.isRunning = false;
      await activeTimer.save();
    }

    // 2. Create new timer in DB immediately
    const newEntry = new TimeEntry({
      user: userId,
      case: caseId,
      task: taskId,
      description,
      startTime: new Date(), // <--- SAVES CURRENT TIME
      isRunning: true,
      duration: 0
    });

    await newEntry.save();
    
    // Return the new entry immediately
    res.status(201).json({ success: true, data: newEntry });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.stopTimer = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await TimeEntry.findOne({ _id: id, user: req.user._id });

    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    if (!entry.isRunning) return res.status(400).json({ success: false, message: 'Timer is not running' });

    // Calculate elapsed time using DB startTime
    const sessionDuration = (Date.now() - new Date(entry.startTime).getTime()) / 1000;
    
    entry.duration += sessionDuration;
    entry.startTime = null;
    entry.isRunning = false;
    
    await entry.save();
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateEntry = async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await TimeEntry.findOneAndUpdate(
      { _id: id, user: req.user._id }, 
      req.body, 
      { new: true }
    );
    if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.status(200).json({ success: true, data: entry });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteEntry = async (req, res) => {
    try {
      const entry = await TimeEntry.findOneAndDelete({ _id: req.params.id, user: req.user._id });
      if (!entry) return res.status(404).json({ success: false, message: 'Entry not found' });
      res.status(200).json({ success: true, message: 'Entry deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
};

exports.exportToExcel = async (req, res) => {
  try {
    const { taskId } = req.query;

    console.log("Exporting time logs for user:", req.user._id, "Task:", taskId);

    // 🔹 Base filter: logged-in user
    const filter = {
      user: req.user._id,
    };

    // 🔹 If taskId is passed, filter by task
    if (taskId) {
      filter.task = taskId;
    }

    const logs = await TimeEntry.find(filter)
      .populate('task', 'title');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Time Logs');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Task', key: 'task', width: 25 },
      { header: 'Description', key: 'description', width: 35 },
      { header: 'Hours', key: 'duration', width: 15 },
      { header: 'Billable', key: 'billable', width: 10 },
    ];

    logs.forEach(log => {
      worksheet.addRow({
        date: log.createdAt
          ? log.createdAt.toISOString().split('T')[0]
          : '',
        task: log.task ? log.task.title : 'N/A',
        description: log.description || '',
        duration: (log.duration / 3600).toFixed(2),
        billable: log.isBillable ? 'Yes' : 'No',
      });
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=time_logs.xlsx'
    );

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

