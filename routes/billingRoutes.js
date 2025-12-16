const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');
const { protect } = require('../middleware/auth'); // Adjust path to where you saved your middleware

// Apply protection to all routes in this file
router.use(protect);

// @desc    Generate a new invoice
// @access  Private (Paralegal only)
router.post('/invoices/generate', billingController.createInvoice);

// @desc    Get all invoices for the logged-in user
// @access  Private (Attorney or Paralegal)
router.get('/invoices', billingController.getInvoices);

// @desc    Get single invoice details
// @access  Private (Owner only)
router.get('/invoices/:id', billingController.getInvoiceById);

// @desc    Record a payment
// @access  Private (Attorney only)
router.post('/payments', billingController.processPayment);

module.exports = router;