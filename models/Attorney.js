// models/Attorney.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const attorneySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full Name is required'],
      trim: true,
    },
    email: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 8,
      select: false,
    },
    phone: String,
    avatar: String,
    firmName: String,
    firmType: {
      type: String,
      enum: ['Solo Practice', 'Small Firm', 'Medium Firm', 'Large Firm'],
    },
    barNumber: String,
    barState: String,
    practiceAreas: [
      {
        type: String,
        enum: [
          'Family Law',
          'Personal Injury',
          'Real Estate',
          'Estate Planning',
          'Intellectual Property',
          'Business Law',
          'Immigration Services',
          'Bankruptcy',
          'Criminal Law',
          'Tax Law',
          'Employment Law',
        ],
      },
    ],
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: { type: String, default: 'United States' },
    },
    timezone: {
      type: String,
      default: 'America/New_York',
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    subscriptionPlan: {
      type: String,
      enum: ['Basic', 'Professional', 'Enterprise'],
      default: 'Basic',
    },
    subscriptionStatus: {
      type: String,
      enum: ['Active', 'Cancelled', 'Suspended', 'Trial'],
      default: 'Trial',
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    verificationToken: String,
  },
  {
    timestamps: true,
  }
);

// Hash password only if present
attorneySchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password safely
attorneySchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Profile completion check
attorneySchema.methods.checkProfileCompletion = function () {
  const requiredFields = ['phone', 'firmName', 'barNumber', 'barState'];
  const isComplete = requiredFields.every(
    (field) => this[field] && this[field].toString().trim() !== ''
  );

  if (this.profileCompleted !== isComplete) {
    this.profileCompleted = isComplete;
  }

  return isComplete;
};

// Indexes
attorneySchema.index({ email: 1 });
attorneySchema.index({ barNumber: 1 });

module.exports = mongoose.model('Attorney', attorneySchema);
