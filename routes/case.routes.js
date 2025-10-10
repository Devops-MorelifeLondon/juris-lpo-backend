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

// Apply rate limiting and authentication to all routes
router.use(apiLimiter);
router.use(protect);

// ========================================
// ATTORNEY & PARALEGAL SHARED ROUTES
// ========================================

// @route   GET /api/cases/stats
// @desc    Get case statistics for logged-in user
// @access  Private (Attorney/Paralegal)
router.get('/stats', getCaseStats);

// @route   GET /api/cases/my-cases
// @desc    Get all cases for logged-in user (filtered by role)
// @access  Private (Attorney/Paralegal)
router.get('/my-cases', getMyCases);

// @route   GET /api/cases/:caseId
// @desc    Get single case by ID
// @access  Private (Attorney/Paralegal - must be assigned)
router.get('/:caseId', getCaseById);

// @route   PATCH /api/cases/:caseId/status
// @desc    Update case status (partial update)
// @access  Private (Attorney/Paralegal)
router.patch('/:caseId/status', updateCaseStatus);

// ========================================
// ATTORNEY ONLY ROUTES
// ========================================

// @route   POST /api/cases
// @desc    Create new case
// @access  Private (Attorney only)
router.post('/', createCase);

// @route   PUT /api/cases/:caseId
// @desc    Update case details (full or partial update)
// @access  Private (Attorney only)
router.put('/:caseId', updateCase);

// @route   PATCH /api/cases/:caseId/archive
// @desc    Archive case (partial update)
// @access  Private (Attorney only)
router.patch('/:caseId/archive', archiveCase);

// @route   DELETE /api/cases/:caseId
// @desc    Delete case (soft delete)
// @access  Private (Attorney only)
router.delete('/:caseId', deleteCase);

// ========================================
// PARALEGAL ONLY ROUTES
// ========================================

// @route   PATCH /api/cases/:caseId/hours
// @desc    Update case hours and cost (partial update)
// @access  Private (Paralegal only)
router.patch('/:caseId/hours', updateCaseHours);

module.exports = router;
