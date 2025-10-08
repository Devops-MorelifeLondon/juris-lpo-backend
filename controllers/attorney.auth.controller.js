// controllers/attorney.auth.controller.js
const Attorney = require('../models/Attorney');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const {  sendBrevoEmailApi } = require('../lib/emailBrevoSdk');
const emailTemplates = require('../lib/emailTemplates');



// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id, role: 'attorney' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Send token response
const sendTokenResponse = (attorney, statusCode, res) => {
  const token = generateToken(attorney._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Update last login
  attorney.lastLogin = Date.now();
  attorney.save({ validateBeforeSave: false });

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    token,
    data: {
      id: attorney._id,
      firstName: attorney.firstName,
      lastName: attorney.lastName,
      email: attorney.email,
      role: 'attorney',
      isVerified: attorney.isVerified,
      profileCompleted: attorney.profileCompleted,
      subscriptionStatus: attorney.subscriptionStatus
    }
  });
};

// @desc    Register attorney (Simple registration - only name, email, password)
// @route   POST /api/attorney/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    console.log("📥 [Register] Received data:", req.body);

    // ✅ Input validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide full name, email, and password.'
      });
    }

    // ✅ Check existing attorney
    const existingAttorney = await Attorney.findOne({ email });
    if (existingAttorney) {
      return res.status(400).json({
        success: false,
        message: 'Attorney with this email already exists.'
      });
    }

    // ✅ Password length validation
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.'
      });
    }

    // ✅ Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // ✅ Create attorney entry
    const attorney = await Attorney.create({
      fullName,
      email,
      password,
      verificationToken,
      subscriptionStatus: 'Trial',
      profileCompleted: false
    });

    // ✅ Construct verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/attorney/verify-email/${verificationToken}`;

    // ✅ Prepare and send Brevo email
    try {
      await sendBrevoEmailApi({
        to_email: { email, name: fullName },
        email_subject: 'Verify Your Juris-LPO Attorney Account',
        htmlContent: emailTemplates.attorneyVerificationTemplate(fullName, verificationUrl)
      });

      console.log("📧 [Register] Verification email sent to:", email);
    } catch (emailError) {
      console.error("❌ [Register] Email sending failed:", emailError.message);
    }

    // ✅ Send token response
    sendTokenResponse(attorney, 201, res);

  } catch (error) {
    console.error("💥 [Register] Error:", error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message
    });
  }
};


const { OAuth2Client } = require("google-auth-library");

// Google login controller
exports.googlelogin = async (req, res) => {
  try {
    const { credential } = req.body; // JWT token from Google frontend
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required"
      });
    }

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name: fullName, picture } = payload;

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token"
      });
    }

    // Check if attorney already exists
    let attorney = await Attorney.findOne({ email });

    if (!attorney) {
      // Create new attorney
      const verificationToken = crypto.randomBytes(32).toString("hex");
      attorney = await Attorney.create({
        fullName,
        email,
        googleId,
        profileCompleted: false,
        subscriptionStatus: "Trial",
        verificationToken,
        avatar: picture
      });

      // Send verification email
      const verificationUrl = `${process.env.FRONTEND_URL}/attorney/verify-email/${verificationToken}`;
      try {
        await sendBrevoEmailApi({
          to_email: { email, name: fullName },
          email_subject: "Verify Your Juris-LPO Attorney Account",
          htmlContent: emailTemplates.attorneyVerificationTemplate(fullName, verificationUrl)
        });
        console.log("📧 Verification email sent to:", email);
      } catch (emailError) {
        console.error("❌ Email sending failed:", emailError.message);
      }
    }

    // Send JWT token to frontend
    sendTokenResponse(attorney, 200, res);

  } catch (error) {
    console.error("💥 Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google login",
      error: error.message
    });
  }
};



// @desc    Login attorney
// @route   POST /api/attorney/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate email & password
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check for attorney (include password field)
    const attorney = await Attorney.findOne({ email }).select('+password');

    if (!attorney) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!attorney.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isPasswordMatch = await attorney.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(attorney, 200, res);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Get current logged in attorney
// @route   GET /api/attorney/auth/me
// @access  Private (Attorney)
exports.getMe = async (req, res) => {
  try {
    const attorney = await Attorney.findById(req.attorney.id);

    if (!attorney) {
      return res.status(404).json({
        success: false,
        message: 'Attorney not found'
      });
    }

    res.status(200).json({
      success: true,
      data: attorney
    });

  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Complete attorney profile
// @route   PUT /api/attorney/auth/complete-profile
// @access  Private (Attorney)
exports.completeProfile = async (req, res) => {
  try {
    const {
      phone,
      firmName,
      firmType,
      barNumber,
      barState,
      practiceAreas,
      address,
      timezone,
      avatar
    } = req.body;

    // Validate required fields for profile completion
    if (!phone || !firmName || !barNumber || !barState) {
      return res.status(400).json({
        success: false,
        message: 'Please provide phone, firm name, bar number, and bar state'
      });
    }

    // Check if bar number is already used by another attorney
    const existingBar = await Attorney.findOne({ 
      barNumber, 
      _id: { $ne: req.attorney.id } 
    });
    
    if (existingBar) {
      return res.status(400).json({
        success: false,
        message: 'This bar number is already registered'
      });
    }

    // Update attorney profile
    const attorney = await Attorney.findByIdAndUpdate(
      req.attorney.id,
      {
        phone,
        firmName,
        firmType,
        barNumber,
        barState,
        practiceAreas,
        address,
        timezone,
        avatar,
        profileCompleted: true
      },
      {
        new: true,
        runValidators: true
      }
    );

    // Send welcome email using template
    const dashboardLink = `${process.env.FRONTEND_URL}/attorney/dashboard`;
    
    try {
      await sendEmail({
        to: attorney.email,
        subject: 'Welcome to Juris-LPO!',
        html: emailTemplates.attorneyWelcomeTemplate(attorney.firstName, firmName, dashboardLink)
      });
    } catch (emailError) {
      console.error('Welcome email sending failed:', emailError);
      // Continue even if email fails
    }

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully',
      data: attorney
    });

  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update attorney profile
// @route   PUT /api/attorney/auth/update-profile
// @access  Private (Attorney)
exports.updateProfile = async (req, res) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phone: req.body.phone,
      firmName: req.body.firmName,
      firmType: req.body.firmType,
      barNumber: req.body.barNumber,
      barState: req.body.barState,
      practiceAreas: req.body.practiceAreas,
      address: req.body.address,
      timezone: req.body.timezone,
      avatar: req.body.avatar
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    // If updating bar number, check if it's already used
    if (fieldsToUpdate.barNumber) {
      const existingBar = await Attorney.findOne({ 
        barNumber: fieldsToUpdate.barNumber,
        _id: { $ne: req.attorney.id }
      });
      
      if (existingBar) {
        return res.status(400).json({
          success: false,
          message: 'This bar number is already registered'
        });
      }
    }

    const attorney = await Attorney.findByIdAndUpdate(
      req.attorney.id,
      fieldsToUpdate,
      {
        new: true,
        runValidators: true
      }
    );

    // Check and update profile completion status
    attorney.checkProfileCompletion();
    await attorney.save();

    res.status(200).json({
      success: true,
      data: attorney
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Logout attorney
// @route   POST /api/attorney/auth/logout
// @access  Private (Attorney)
exports.logout = async (req, res) => {
  try {
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

// @desc    Verify email
// @route   GET /api/attorney/auth/verify-email/:token
// @access  Public
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const attorney = await Attorney.findOne({ verificationToken: token });

    if (!attorney) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update attorney
    attorney.isVerified = true;
    attorney.verificationToken = undefined;
    await attorney.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification',
      error: error.message
    });
  }
};

// @desc    Forgot password
// @route   POST /api/attorney/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const attorney = await Attorney.findOne({ email });

    if (!attorney) {
      return res.status(404).json({
        success: false,
        message: 'No attorney found with that email'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    attorney.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    attorney.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await attorney.save();

    // Create reset URL and send email using template
    const resetUrl = `${process.env.FRONTEND_URL}/attorney/reset-password/${resetToken}`;

    try {
      await sendEmail({
        to: email,
        subject: 'Password Reset Request - Juris-LPO',
        html: emailTemplates.attorneyPasswordResetTemplate(attorney.firstName, resetUrl)
      });

      res.status(200).json({
        success: true,
        message: 'Password reset email sent'
      });

    } catch (emailError) {
      attorney.resetPasswordToken = undefined;
      attorney.resetPasswordExpires = undefined;
      await attorney.save();

      return res.status(500).json({
        success: false,
        message: 'Email could not be sent'
      });
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reset password
// @route   PUT /api/attorney/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Hash token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const attorney = await Attorney.findOne({
      resetPasswordToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!attorney) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // Set new password
    attorney.password = password;
    attorney.resetPasswordToken = undefined;
    attorney.resetPasswordExpires = undefined;
    await attorney.save();

    sendTokenResponse(attorney, 200, res);

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/attorney/auth/update-password
// @access  Private (Attorney)
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    const attorney = await Attorney.findById(req.attorney.id).select('+password');

    // Check current password
    const isMatch = await attorney.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    attorney.password = newPassword;
    await attorney.save();

    sendTokenResponse(attorney, 200, res);

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete attorney account
// @route   DELETE /api/attorney/auth/delete-account
// @access  Private (Attorney)
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your password to confirm deletion'
      });
    }

    const attorney = await Attorney.findById(req.attorney.id).select('+password');

    // Verify password
    const isMatch = await attorney.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    // Soft delete - deactivate account
    attorney.isActive = false;
    await attorney.save();

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};
