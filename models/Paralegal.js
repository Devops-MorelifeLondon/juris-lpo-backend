// models/Paralegal.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const paralegalSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 8,
    select: false
  },
  phone: {
    type: String,
    required: true
  },
  avatar: String,
  headline: {
    type: String,
    required: true,
    maxlength: 100
  },
  about: {
    type: String,
    required: true,
    maxlength: 1000
  },
  specializations: [{
    type: String,
    enum: [
      'Legal Research', 'Document Drafting', 'Case Management',
      'Discovery', 'Court Filing', 'Contract Review', 'Litigation Support'
    ]
  }],
  practiceAreas: [{
    type: String,
    enum: [
      'Family Law', 'Personal Injury', 'Real Estate', 'Estate Planning',
      'Intellectual Property', 'Business Law', 'Immigration Services',
      'Bankruptcy', 'Criminal Law', 'Tax Law', 'Employment Law'
    ]
  }],
  yearsOfExperience: {
    type: Number,
    default: 0
  },
  education: [{
    degree: String,
    institution: String,
    graduationYear: Number
  }],
  certifications: [{
    name: String,
    issuingOrganization: String,
    issueDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  availability: {
    type: String,
    enum: ['Available Now', 'Available Soon', 'Fully Booked', 'Not Available'],
    default: 'Available Now'
  },
  workingHours: {
    timezone: String,
    schedule: [{
      day: String,
      startTime: String,
      endTime: String,
      available: { type: Boolean, default: true }
    }]
  },
  maxActiveCases: {
    type: Number,
    default: 10
  },
  currentActiveCases: {
    type: Number,
    default: 0
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'United States' }
  },
  timezone: {
    type: String,
    default: 'America/New_York'
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  totalCasesCompleted: {
    type: Number,
    default: 0
  },
  sopComplianceRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  onTimeDeliveryRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  isPublicProfile: {
    type: Boolean,
    default: true
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verificationToken: String
}, {
  timestamps: true
});

// Hash password
paralegalSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
paralegalSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full name
paralegalSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Paralegal', paralegalSchema);
