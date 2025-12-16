const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
    required: true
  },
  payer: { // The Attorney
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attorney',
    required: true
  },
  payee: { // The Paralegal or Platform
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paralegal'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  paymentMethod: {
    type: String,
    enum: ['Credit Card', 'Bank Transfer', 'PayPal', 'Other'],
    default: 'Credit Card'
  },
  transactionId: {
    type: String, // External ID from Stripe/PayPal
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Completed', 'Failed', 'Refunded'],
    default: 'Pending'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  failureReason: String
}, {
  timestamps: true
});

module.exports = mongoose.model('billTransaction', transactionSchema);