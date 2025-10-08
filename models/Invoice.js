// models/Invoice.js
const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true
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
  case: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Case',
    required: true
  },
  billingPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  workLogs: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkLog'
  }],
  items: [{
    description: String,
    hours: Number,
    rate: Number,
    amount: Number
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    percentage: Number,
    amount: Number
  },
  platformFee: {
    percentage: Number,
    amount: Number
  },
  total: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
    default: 'Draft'
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: Date,
  paymentMethod: String,
  transactionId: String,
  pdfUrl: String,
  notes: String
}, {
  timestamps: true
});

// Auto-generate invoice number
invoiceSchema.pre('save', async function(next) {
  if (this.isNew && !this.invoiceNumber) {
    const count = await mongoose.model('Invoice').countDocuments();
    this.invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes
invoiceSchema.index({ attorney: 1, status: 1 });
invoiceSchema.index({ paralegal: 1, status: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
