// controllers/case.auth.controller.js
const Case = require('../models/Case');
const Attorney = require('../models/Attorney');
const Paralegal = require('../models/Paralegal');
const jwt = require('jsonwebtoken');
const { sendBrevoEmailApi } = require('../lib/emailBrevoSdk');
const emailTemplates = require('../lib/emailTemplates');
const connectDB = require('../config/db');

// Generate JWT Token with role
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// @desc    Create new case (Attorney only)
// @route   POST /api/cases
// @access  Private (Attorney)
exports.createCase = async (req, res) => {
  try {
    await connectDB();
    console.log("REQ USER:", req.user);

    const {
      caseNumber,
      name,
      client,
      serviceType,
      otherServiceTypeDescription, // Added this line
      status,
      priority,
      deadline,
      budget,
      agreedHourlyRate,
      actualHoursSpent,
      totalCost,
      notes,
    } = req.body;

    console.log("📦 Request Body:", req.body);

    // ✅ Validate required fields
    if (!name || !serviceType || !caseNumber || !client?.name) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: caseNumber, name, client.name, serviceType",
      });
    }

    // ✅ Conditionally validate otherServiceTypeDescription
    if (
      serviceType === "Other" &&
      (!otherServiceTypeDescription ||
        otherServiceTypeDescription.trim() === "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Description for 'Other' service type is required.",
      });
    }

    // ✅ Ensure user exists in request
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Attorney information missing.",
      });
    }

    // ✅ Create case data object
    const newCaseData = {
      caseNumber,
      name,
      notes: notes || "",
      attorney: req.user.id,
      client: {
        name: client.name,
        email: client.email || "",
        phone: client.phone || "",
        address: client.address || "",
      },
      serviceType,
      status: status || "New",
      priority: priority || "Medium",
      deadline: deadline || null,
      budget: Number(budget) || 0,
      agreedHourlyRate: Number(agreedHourlyRate) || 0,
      actualHoursSpent: Number(actualHoursSpent) || 0,
      totalCost: Number(totalCost) || 0,
      assignmentDetails: {
        requestedAt: Date.now(),
      },
    };

    // ✅ Add otherServiceTypeDescription if serviceType is 'Other'
    if (serviceType === "Other") {
      newCaseData.otherServiceTypeDescription = otherServiceTypeDescription;
    }
    
    const newCase = await Case.create(newCaseData);

    // ✅ Populate attorney details before sending response
    const populatedCase = await Case.findById(newCase._id)
      .populate("attorney", "fullName email firmName")
      .populate("paralegal", "fullName email");

    res.status(201).json({
      success: true,
      message: "Case created successfully",
      data: populatedCase,
    });
  } catch (error) {
    console.error("💥 Create case error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: Object.values(error.errors).map((err) => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Case number already exists",
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error during case creation",
      error: error.message,
    });
  }
};


// @desc    Get all cases for logged-in user (based on role)
// @route   GET /api/cases/my-cases
// @access  Private (Attorney/Paralegal)
exports.getMyCases = async (req, res) => {
  try {
    await connectDB();
    
    const { status, priority, serviceType, search, page = 1, limit = 10 } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Build query based on role
    let query = { isArchived: false };
    
    if (userRole === 'attorney') {
      query.attorney = userId;
    } else if (userRole === 'paralegal') {
      query.paralegal = userId;
    } else {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    // Apply filters
    if (status && status !== 'All') query.status = status;
    if (priority && priority !== 'All') query.priority = priority;
    if (serviceType && serviceType !== 'All') query.serviceType = serviceType;
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { caseNumber: { $regex: search, $options: 'i' } },
        { 'client.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (page - 1) * limit;

    const cases = await Case.find(query)
      .populate('attorney', 'fullName email firmName')
      .populate('paralegal', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(); // Convert to plain JavaScript objects

    const total = await Case.countDocuments(query);

    console.log("✅ Cases fetched:", {
      success: true,
      count: cases.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
    });

    res.status(200).json({
      success: true,
      count: cases.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: Number(page),
      data: cases
    });

  } catch (error) {
    console.error('💥 Get cases error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching cases',
      error: error.message
    });
  }
};

// @desc    Get single case details
// @route   GET /api/cases/:caseId
// @access  Private (Attorney/Paralegal - must be assigned to case)
exports.getCaseById = async (req, res) => {
  try {
    await connectDB();
    
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const caseData = await Case.findById(caseId)
      .populate('attorney', 'fullName email firmName phone barNumber')
      .populate('paralegal', 'fullName email phone specialties')
      .lean();

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Verify user has access to this case
    const hasAccess = 
      (userRole === 'attorney' && caseData.attorney?._id?.toString() === userId) ||
      (userRole === 'paralegal' && caseData.paralegal?._id?.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this case'
      });
    }

    res.status(200).json({
      success: true,
      data: caseData
    });

  } catch (error) {
    console.error('💥 Get case by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching case details',
      error: error.message
    });
  }
};

// @desc    Update case (Attorney only) - Full or Partial Update
// @route   PUT /api/cases/:caseId
// @access  Private (Attorney)
exports.updateCase = async (req, res) => {
  try {
    await connectDB();
    
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Only attorneys can update cases
    if (userRole !== 'attorney') {
      return res.status(403).json({
        success: false,
        message: 'Only attorneys can update cases'
      });
    }

    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Verify attorney owns this case
    if (caseData.attorney.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this case'
      });
    }

    // Fields that can be updated
    const allowedUpdates = [
      'name',
      'caseNumber',
      'client',
      'serviceType',
      'status',
      'priority',
      'deadline',
      'budget',
      'agreedHourlyRate',
      'actualHoursSpent',
      'totalCost',
      'notes'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle nested client object updates
    if (req.body.client) {
      updates.client = {
        name: req.body.client.name || caseData.client.name,
        email: req.body.client.email || caseData.client.email || "",
        phone: req.body.client.phone || caseData.client.phone || "",
        address: req.body.client.address || caseData.client.address || ""
      };
    }

    // Convert number fields
    if (updates.budget) updates.budget = Number(updates.budget);
    if (updates.agreedHourlyRate) updates.agreedHourlyRate = Number(updates.agreedHourlyRate);
    if (updates.actualHoursSpent) updates.actualHoursSpent = Number(updates.actualHoursSpent);
    if (updates.totalCost) updates.totalCost = Number(updates.totalCost);

    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      { $set: updates },
      { new: true, runValidators: true }
    )
    .populate('attorney', 'fullName email firmName')
    .populate('paralegal', 'fullName email');

    res.status(200).json({
      success: true,
      message: 'Case updated successfully',
      data: updatedCase
    });

  } catch (error) {
    console.error('💥 Update case error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message
        }))
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating case',
      error: error.message
    });
  }
};

// @desc    Update case status (Attorney or Paralegal)
// @route   PATCH /api/cases/:caseId/status
// @access  Private (Attorney/Paralegal)
exports.updateCaseStatus = async (req, res) => {
  try {
    await connectDB();
    
    const { caseId } = req.params;
    const { status, declineReason } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const caseData = await Case.findById(caseId)
      .populate('attorney', 'fullName email')
      .populate('paralegal', 'fullName email');

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Verify user has access
    const hasAccess = 
      (userRole === 'attorney' && caseData.attorney._id.toString() === userId) ||
      (userRole === 'paralegal' && caseData.paralegal?._id?.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this case'
      });
    }

    // Update status
    caseData.status = status;
    
    if (status === 'Accepted' || status === 'Declined') {
      caseData.assignmentDetails.respondedAt = Date.now();
      if (status === 'Declined' && declineReason) {
        caseData.assignmentDetails.declineReason = declineReason;
      }
    }

    if (status === 'Completed') {
      caseData.completedAt = Date.now();
    }

    await caseData.save();

    // Send notification email
    try {
      const recipient = userRole === 'paralegal' ? caseData.attorney : caseData.paralegal;
      if (recipient) {
        await sendBrevoEmailApi({
          to_email: { email: recipient.email, name: recipient.fullName },
          email_subject: `Case Status Updated: ${caseData.caseNumber}`,
          htmlContent: emailTemplates.caseStatusUpdateTemplate(
            recipient.fullName,
            caseData.caseNumber,
            caseData.name,
            status
          )
        });
      }
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Case status updated successfully',
      data: caseData
    });

  } catch (error) {
    console.error('💥 Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating case status',
      error: error.message
    });
  }
};

// @desc    Update case hours and cost (Paralegal)
// @route   PATCH /api/cases/:caseId/hours
// @access  Private (Paralegal)
exports.updateCaseHours = async (req, res) => {
  try {
    await connectDB();
    
    const { caseId } = req.params;
    const { hoursSpent } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'paralegal') {
      return res.status(403).json({
        success: false,
        message: 'Only paralegals can update case hours'
      });
    }

    if (!hoursSpent || hoursSpent < 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid hours spent is required'
      });
    }

    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Verify paralegal is assigned to this case
    if (!caseData.paralegal || caseData.paralegal.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not assigned to this case'
      });
    }

    // Update hours and calculate cost
    caseData.actualHoursSpent = (caseData.actualHoursSpent || 0) + Number(hoursSpent);
    caseData.totalCost = caseData.actualHoursSpent * caseData.agreedHourlyRate;

    await caseData.save();

    res.status(200).json({
      success: true,
      message: 'Case hours updated successfully',
      data: {
        caseNumber: caseData.caseNumber,
        actualHoursSpent: caseData.actualHoursSpent,
        totalCost: caseData.totalCost,
        agreedHourlyRate: caseData.agreedHourlyRate
      }
    });

  } catch (error) {
    console.error('💥 Update hours error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating case hours',
      error: error.message
    });
  }
};

// @desc    Archive case (Attorney only)
// @route   PATCH /api/cases/:caseId/archive
// @access  Private (Attorney)
exports.archiveCase = async (req, res) => {
  try {
    await connectDB();
    
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'attorney') {
      return res.status(403).json({
        success: false,
        message: 'Only attorneys can archive cases'
      });
    }

    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    if (caseData.attorney.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to archive this case'
      });
    }

    caseData.isArchived = true;
    await caseData.save();

    res.status(200).json({
      success: true,
      message: 'Case archived successfully'
    });

  } catch (error) {
    console.error('💥 Archive case error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error archiving case',
      error: error.message
    });
  }
};

// @desc    Delete case (Attorney only - soft delete)
// @route   DELETE /api/cases/:caseId
// @access  Private (Attorney)
exports.deleteCase = async (req, res) => {
  try {
    await connectDB();
    
    const { caseId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole !== 'attorney') {
      return res.status(403).json({
        success: false,
        message: 'Only attorneys can delete cases'
      });
    }

    const caseData = await Case.findById(caseId);

    if (!caseData) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    if (caseData.attorney.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this case'
      });
    }

    // Soft delete - archive instead
    caseData.isArchived = true;
    caseData.status = 'Cancelled';
    await caseData.save();

    res.status(200).json({
      success: true,
      message: 'Case deleted successfully'
    });

  } catch (error) {
    console.error('💥 Delete case error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting case',
      error: error.message
    });
  }
};

// @desc    Get case statistics (Attorney/Paralegal)
// @route   GET /api/cases/stats
// @access  Private (Attorney/Paralegal)
exports.getCaseStats = async (req, res) => {
  try {
    await connectDB();
    
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = { isArchived: false };
    
    if (userRole === 'attorney') {
      query.attorney = userId;
    } else if (userRole === 'paralegal') {
      query.paralegal = userId;
    }

    const stats = await Case.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          totalHours: { $sum: '$actualHoursSpent' }
        }
      }
    ]);

    const priorityStats = await Case.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    const serviceTypeStats = await Case.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalCases = await Case.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        totalCases,
        byStatus: stats,
        byPriority: priorityStats,
        byServiceType: serviceTypeStats
      }
    });

  } catch (error) {
    console.error('💥 Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching case statistics',
      error: error.message
    });
  }
};


