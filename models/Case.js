// models/Case.js
const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
  caseNumber: {
    type: String,
    unique: true,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
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
  client: {
    name: String,
    email: String,
    phone: String,
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    }
  },
  serviceType: {
    type: String,
    required: true,
    enum: [
      'Family Law', 'Personal Injury', 'Real Estate', 'Estate Planning',
      'Intellectual Property', 'Business Law', 'Immigration Services',
      'Bankruptcy', 'Criminal Law', 'Tax Law', 'Employment Law'
    ]
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Declined', 'In Progress', 'Review', 'Completed', 'Cancelled'],
    default: 'Pending'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Critical'],
    default: 'Medium'
  },
  deadline: {
    type: Date,
    required: true
  },
  budget: {
    type: Number,
    default: 0
  },
  agreedHourlyRate: {
    type: Number,
    required: true
  },
  estimatedHours: Number,
  actualHoursSpent: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  courtDetails: {
    courtName: String,
    caseNumber: String,
    filingDate: Date,
    hearingDate: Date,
    judge: String
  },
  notes: String,
  assignmentDetails: {
    requestedAt: {
      type: Date,
      default: Date.now
    },
    respondedAt: Date,
    declineReason: String
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  completedAt: Date
}, {
  timestamps: true
});

// Auto-generate case number
caseSchema.pre('save', async function(next) {
  if (this.isNew && !this.caseNumber) {
    const count = await mongoose.model('Case').countDocuments();
    this.caseNumber = `CASE-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Indexes
caseSchema.index({ attorney: 1, status: 1 });
caseSchema.index({ paralegal: 1, status: 1 });
caseSchema.index({ caseNumber: 1 });

module.exports = mongoose.model('Case', caseSchema);
