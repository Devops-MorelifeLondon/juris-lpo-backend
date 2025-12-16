const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  attorney: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attorney',
    required: true
  },
  paralegal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paralegal',
    required: true
  },
  // Link specific time entries to this invoice to prevent double billing
  timeEntries: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TimeEntry'
  }],
  // Link specific tasks (for fixed-fee billing scenarios)
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  items: [{
    description: String,
    quantity: Number, // Hours or Units
    rate: Number,
    amount: Number,
    refType: { type: String, enum: ['TimeEntry', 'Task', 'Adjustment'] },
    refId: mongoose.Schema.Types.ObjectId
  }],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  platformFee: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled', 'Void'],
    default: 'Draft'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAt: Date,
  notes: String,
  terms: String // e.g., "Net 30"
}, {
  timestamps: true
});

// Indexes for quick lookup
invoiceSchema.index({ attorney: 1, status: 1 });
invoiceSchema.index({ paralegal: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);