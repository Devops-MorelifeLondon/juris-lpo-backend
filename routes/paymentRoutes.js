const express = require("express");
const {
  createPaymentIntent,
  createCheckoutSession,
  stripeWebhook
} = require("../controllers/paymentController");
const { protect } = require('../middleware/auth');

const router = express.Router();

// Main payment endpoints
router.post("/create-payment-intent",protect, createPaymentIntent);
router.post("/create-checkout-session",protect, createCheckoutSession);

// Stripe webhook (RAW body)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

module.exports = router;
