const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    attorney: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attorney',
      required: true,
    },
    // Link to the subscription if this is a recurring payment
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
      default: null 
    },
    stripePaymentIntentId: {
      type: String,
      required: true,
      unique: true,
    },
    stripeInvoiceId: {
      type: String, // Optional, only exists for subscription payments
    },
    amount: {
      type: Number,
      required: true, // Stored in cents (e.g., $40.00 = 4000)
    },
    currency: {
      type: String,
      default: 'usd',
    },
    status: {
      type: String,
      enum: ['succeeded', 'pending', 'failed', 'refunded'],
      required: true,
    },
    paymentMethod: {
      brand: String, // e.g., 'visa', 'mastercard'
      last4: String, // e.g., '4242'
    },
    // Distinguish between monthly fees vs one-off services
    type: {
        type: String,
        enum: ['subscription_creation', 'subscription_cycle', 'one_time_service', 'adjustment'],
        required: true
    },
    description: {
        type: String, // e.g., "Family Law Bundle - Oct 2024"
    },
    billingDetails: {
        name: String,
        email: String,
        address: {
            line1: String,
            city: String,
            postal_code: String,
            country: String
        }
    },
    receiptUrl: String, // URL to Stripe hosted receipt
  },
  {
    timestamps: true,
  }
);

// Compound index: Find all transactions for a specific attorney, sorted by newest first
transactionSchema.index({ attorney: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);