const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Middleware to protect routes (assuming you have auth middleware)
const { protect } = require('../middleware/auth'); 

// POST /api/payments/create-intent
// Creates a one-time payment intent
router.post('/create-intent', protect, paymentController.createPaymentIntent);

// POST /api/payments/create-subscription
// Creates a recurring subscription session
router.post('/create-subscription', protect, paymentController.createSubscription);

// POST /api/payments/webhook
// Stripe calls this. MUST be raw body parser in main app or handled specifically.
router.post('/webhook', express.raw({type: 'application/json'}), paymentController.handleStripeWebhook);

// GET /api/payments/history/:attorneyId
// Fetch transaction ledger
router.get('/history/:attorneyId', protect, paymentController.getTransactions);

module.exports = router;