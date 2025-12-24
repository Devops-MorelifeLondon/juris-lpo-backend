const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full Name is required'],
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
  role: {
    type: String,
    enum: ['root', 'admin'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Hash password
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Add a method to generate the reset token
adminSchema.methods.createPasswordResetToken = function() {
  const resetToken = require('crypto').randomBytes(32).toString('hex');

  // Hash the token and save to database (security best practice)
  this.passwordResetToken = require('crypto')
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Token valid for 1 hour
  this.passwordResetExpires = Date.now() + 3600000;

  return resetToken;
};

module.exports = mongoose.model('Admin', adminSchema);