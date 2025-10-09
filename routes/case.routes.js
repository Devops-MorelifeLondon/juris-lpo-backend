// routes/case.routes.js
const express = require('express');
const router = express.Router();
const {
    createCase,
    getMyCases,
    getCaseById,
    updateCaseStatus,
    updateCase,
    updateCaseHours,
    archiveCase,
    deleteCase,
    getCaseStats
} = require('../controllers/case.auth.controller');





const { apiLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');

// Apply rate limiting to all case routes
router.use(apiLimiter);

// Public routes - None (all case routes require authentication)

// ========================================
// ATTORNEY & PARALEGAL SHARED ROUTES
// ========================================

// @route   GET /api/cases/my-cases
// @desc    Get all cases for logged-in user (filtered by role)
// @access  Private (Attorney/Paralegal)
router.get('/my-cases',protect, getMyCases);

// @route   GET /api/cases/stats
// @desc    Get case statistics for logged-in user
// @access  Private (Attorney/Paralegal)
router.get('/stats', getCaseStats);

// @route   GET /api/cases/:caseId
// @desc    Get single case by ID
// @access  Private (Attorney/Paralegal - must be assigned)
router.get('/:caseId', getCaseById);

// @route   PUT /api/cases/:caseId/status
// @desc    Update case status
// @access  Private (Attorney/Paralegal)
router.put(
    '/:caseId/status',
    updateCaseStatus
);

// ========================================
// ATTORNEY ONLY ROUTES
// ========================================

// @route   POST /api/cases/create
// @desc    Create new case and assign to paralegal
// @access  Private (Attorney only)
router.post(
    '/create',
    protect,
    createCase
);

// @route   PUT /api/cases/:caseId/update
// @desc    Update case details
// @access  Private (Attorney only)
router.put(
    '/:caseId/update',

    updateCase
);

// @route   PUT /api/cases/:caseId/archive
// @desc    Archive case
// @access  Private (Attorney only)
router.put(
    '/:caseId/archive',

    archiveCase
);

// @route   DELETE /api/cases/:caseId
// @desc    Delete case (soft delete)
// @access  Private (Attorney only)
router.delete(
    '/:caseId',

    deleteCase
);

// ========================================
// PARALEGAL ONLY ROUTES
// ========================================

// @route   PUT /api/cases/:caseId/hours
// @desc    Update case hours and cost
// @access  Private (Paralegal only)
router.put(
    '/:caseId/hours',

    updateCaseHours
);

module.exports = router;
