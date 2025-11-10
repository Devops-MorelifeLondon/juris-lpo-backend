// controllers/paralegalController.js

const bcrypt = require('bcryptjs');

const crypto = require('crypto');
const connectDB = require('../config/db');
const { OAuth2Client } = require('google-auth-library');
const { sendBrevoEmailApi } = require('../lib/emailBrevoSdk');
const emailTemplates = require('../lib/emailTemplates');
const jwt = require("jsonwebtoken");
const Paralegal = require("../models/Paralegal"); // adjust path as needed


const generateToken = (id) => {
  return jwt.sign({ id, role: 'paralegal' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

const sendTokenResponse = (paralegal, statusCode, res) => {
  const token = generateToken(paralegal._id);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  // Update last login
  paralegal.lastLogin = Date.now();
  paralegal.save({ validateBeforeSave: false });

  res.status(statusCode).cookie('token', token, cookieOptions).json({
    success: true,
    token,
    data: {
      firstName: paralegal.firstName,
      lastName: paralegal.lastName,
      email: paralegal.email,
    }
  });
};

// Create a new paralegal
exports.createParalegal = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // 1️⃣ Input Validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    // 2️⃣ Check if user already exists
    const existingParalegal = await Paralegal.findOne({ email: email.trim().toLowerCase() });
    if (existingParalegal) {
      return res.status(400).json({
        success: false,
        message: "Email is already registered",
      });
    }

    // 3️⃣ Create new paralegal
    const paralegal = new Paralegal({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
    await paralegal.save();

    // 4️⃣ Generate Email Verification Token (valid for 30 min)
    const token = jwt.sign(
      { id: paralegal._id },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const verificationUrl = `${process.env.BACKEND_URL}/api/paralegals/verify-email/${token}`;
    const fullName = `${paralegal.firstName} ${paralegal.lastName}`;

    // 5️⃣ Send verification email (non-blocking, safely handled)
    try {
      await sendBrevoEmailApi({
        to_email: [{ email, name: fullName }],
        email_subject: "Verify Your Juris-LPO Paralegal Account",
        htmlContent: emailTemplates.paralegalVerificationTemplate(fullName, verificationUrl),
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError.message);
      // Email fail should not block user creation
    }

    // 6️⃣ Send success + JWT for immediate login (optional)
    sendTokenResponse(paralegal, 201, res, {
      message: "Paralegal registered successfully. Please verify your email.",
    });

  } catch (error) {
    console.error("Error creating paralegal:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};


exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // 1️⃣ Check if token is provided
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Verification token is missing",
      });
    }

    // 2️⃣ Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Verification link has expired"
          : "Invalid verification token";
      return res.status(400).json({
        success: false,
        message,
      });
    }

    // 3️⃣ Extract user ID from decoded token
    const { id } = decoded;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Invalid verification data",
      });
    }

    // 4️⃣ Find user
    const paralegal = await Paralegal.findById(id);
    if (!paralegal) {
      return res.status(404).json({
        success: false,
        message: "Account not found or already removed",
      });
    }

    // 5️⃣ Check if already verified
    if (paralegal.isVerified) {
      return res.status(200).json({
        success: true,
        message: `${paralegal.email} is already verified`,
      });
    }

    // 6️⃣ Update verification status
    paralegal.isVerified = true;
    await paralegal.save();

    // 7️⃣ Success response
    res.status(200).json({
      success: true,
      message: `${paralegal.email} has been successfully verified`,
    });
  } catch (error) {
    console.error("Error verifying email:", error.message);
    res.status(500).json({
      success: false,
      message: "Internal server error, please try again later",
    });
  }
};


// Get all paralegals
exports.getAllParalegals = async (req, res) => {
  try {
    const paralegals = await Paralegal.find();
    res.status(200).json({ success: true, data: paralegals });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get paralegal by ID
exports.getParalegalById = async (req, res) => {
  try {
    const { _id } = req.user;
    const paralegal = await Paralegal.findById(_id);

    if (!paralegal) {
      return res.status(404).json({ success: false, error: 'Paralegal not found' });
    }
    res.status(200).json({ success: true, data: paralegal });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update paralegal by ID
exports.updateParalegal = async (req, res) => {
  try {
    const { _id } = req.user;
    const paralegal = await Paralegal.findByIdAndUpdate(_id, req.body, {
      new: true,
      runValidators: true
    });
    if (!paralegal) {
      return res.status(404).json({ success: false, error: 'Paralegal not found' });
    }
    res.status(200).json({ success: true, data: paralegal });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// Delete paralegal by ID
exports.deleteParalegal = async (req, res) => {
  try {
    const paralegal = await Paralegal.findByIdAndDelete(req.params.id);
    if (!paralegal) {
      return res.status(404).json({ success: false, error: 'Paralegal not found' });
    }
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Paralegal login
exports.loginParalegal = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(req.body);
    const paralegal = await Paralegal.findOne({ email }).select('+password');
    if (!paralegal) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    const isMatch = await paralegal.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }

    // You can generate a JWT token here for authentication

    sendTokenResponse(paralegal, 201, res);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.googlelogin = async (req, res) => {
  try {
    await connectDB();
    console.log("It is trigeered");
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

    const parts = fullName.trim().split(" ");
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    if (!email || !googleId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token"
      });
    }

    // Check if attorney already exists
    let paralegal = await Paralegal.findOne({ email });

    // if (!paralegal) {
    //   // Create new attorney
    //   const verificationToken = crypto.randomBytes(32).toString("hex");
    //   paralegal = await Paralegal.create({
    //     firstName,
    //     lastName,
    //     email,
    //     avatar: picture
    //   });

    //   // Send verification email
    //   const verificationUrl = `${process.env.FRONTEND_URL}/paralegal/verify-email/${verificationToken}`;
    //   try {
    //     await sendBrevoEmailApi({
    //       to_email: { email, name: fullName },
    //       email_subject: "Verify Your Juris-LPO Paralegal Account",
    //       htmlContent: emailTemplates.attorneyVerificationTemplate(fullName, verificationUrl)
    //     });
    //     console.log("📧 Verification email sent to:", email);
    //   } catch (emailError) {
    //     console.error("❌ Email sending failed:", emailError.message);
    //   }
    // }

    // Send JWT token to frontend
    sendTokenResponse(paralegal, 200, res);

  } catch (error) {
    console.error("💥 Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during Google login",
      error: error.message
    });
  }
};

// controllers/paralegalController.js
exports.availableStatus = async (req, res) => {
  try {
    const { _id } = req.user;

    // GET request → return availability
    if (req.method === 'GET') {
      const paralegal = await Paralegal.findById(_id).select('availability');
      if (!paralegal) {
        return res.status(404).json({ success: false, error: 'Paralegal not found' });
      }
      return res.status(200).json({ success: true, status: paralegal.availability });
    }

    // PATCH request → update availability
    if (req.method === 'PATCH') {
      const { availability } = req.body;

      // Validate incoming value
      const validStatuses = ['Available Now', 'Available Soon', 'Fully Booked', 'Not Available'];
      if (!validStatuses.includes(availability)) {
        return res.status(400).json({ success: false, error: 'Invalid availability status' });
      }

      const paralegal = await Paralegal.findByIdAndUpdate(
        _id,
        { availability },
        { new: true, runValidators: true }
      );

      if (!paralegal) {
        return res.status(404).json({ success: false, error: 'Paralegal not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Availability updated successfully',
        status: paralegal.availability,
      });
    }

    // Fallback
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};



// ==========================
// 🔐 Forgot Password Controller
// ==========================
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1️⃣ Validate Email
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Please provide your registered email",
      });
    }

    // 2️⃣ Check if paralegal exists
    const paralegal = await Paralegal.findOne({ email });
    if (!paralegal) {
      return res.status(404).json({
        success: false,
        error: "No account found with this email address",
      });
    }

    // 3️⃣ Generate a reset token (valid for 30 min)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save reset token and expiry in DB
    paralegal.passwordResetToken = resetTokenHash;
    paralegal.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await paralegal.save({ validateBeforeSave: false });

    // 4️⃣ Create Reset URL (Frontend URL)
    const resetUrl = `${process.env.PARALEGAL_FRONTEND_URL}/reset-password/${resetToken}`;

    // 5️⃣ Send Email
    try {
      await sendBrevoEmailApi({
        to_email: [{ email: paralegal.email, name: paralegal.firstName }],
        email_subject: "Reset Your Juris-LPO Paralegal Password",
        htmlContent: emailTemplates.paralegalPasswordResetTemplate(
          paralegal.firstName,
          resetUrl
        ),
      });

      res.status(200).json({
        success: true,
        message: "Password reset link has been sent to your email address.",
      });
    } catch (emailError) {
      // Remove token fields if email sending fails
      paralegal.passwordResetToken = undefined;
      paralegal.passwordResetExpires = undefined;
      await paralegal.save({ validateBeforeSave: false });

      console.error("Email sending failed:", emailError.message);
      res.status(500).json({
        success: false,
        error: "Failed to send reset email. Please try again later.",
      });
    }
  } catch (error) {
    console.error("Forgot Password Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Internal server error. Please try again later.",
    });
  }
};

// ==========================
// 🔁 Reset Password Controller
// ==========================
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // 1️⃣ Validate Input
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Both password and confirm password are required",
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: "Passwords do not match",
      });
    }

    // 2️⃣ Hash the token for DB lookup
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // 3️⃣ Find paralegal with valid (non-expired) token
    const paralegal = await Paralegal.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!paralegal) {
      return res.status(400).json({
        success: false,
        error: "Invalid or expired reset token",
      });
    }

    // 4️⃣ Update password and clear reset fields
    paralegal.password = password;
    paralegal.passwordResetToken = undefined;
    paralegal.passwordResetExpires = undefined;
    await paralegal.save();

    // 5️⃣ Send confirmation email
    try {
      await sendBrevoEmailApi({
        to_email: [{ email: paralegal.email, name: paralegal.firstName }],
        email_subject: "Your Juris-LPO Password Was Changed",
        htmlContent: `
          <h2>Hello ${paralegal.firstName},</h2>
          <p>Your password has been successfully reset. If you did not perform this action, please contact our support team immediately.</p>
          <p style="color: #6b7280; font-size: 13px;">Juris-LPO Security Team</p>
        `,
      });
    } catch (err) {
      console.error("Confirmation email failed:", err.message);
    }

    res.status(200).json({
      success: true,
      message: "Password has been successfully reset. You can now log in.",
    });
  } catch (error) {
    console.error("Reset Password Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Server error during password reset. Please try again later.",
    });
  }
};


// ==========================
// 📊 Paralegal Dashboard Info Controller
// ==========================
const Task = require("../models/Task");

exports.getDashboardInfo = async (req, res) => {
  try {
    const attorneyId = req.user._id; // assuming 'protect' adds this field
    console.log("Getdash user" , req.user);

    // 1️⃣ Fetch assigned paralegals and their tasks
    const tasks = await Task.find({ assignedBy: attorneyId })
      .populate("assignedTo", "firstName lastName avatar practiceAreas specializations availability")
      .lean();
      console.log(tasks);

    const assignedParalegalsMap = {};

    for (const task of tasks) {
      if (!task.assignedTo) continue;
      const p = task.assignedTo;

      if (!assignedParalegalsMap[p._id]) {
        assignedParalegalsMap[p._id] = {
          id: p._id,
          name: `${p.firstName} ${p.lastName}`,
          avatar: p.avatar,
          expertise: p.practiceAreas || [],
          training: p.specializations || [],
          tasks: [],
        };
      }

      const progress =
        task.status === "Completed" ? 100 :
        task.status === "In Progress" ? 70 :
        task.status === "To do" ? 20 : 0;

      assignedParalegalsMap[p._id].tasks.push({
        id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        progress,
        comments: task.comments || [],
      });
    }

    const assignedParalegals = Object.values(assignedParalegalsMap);

    // 2️⃣ Fetch available paralegals
    const availableParalegals = await Paralegal.find({
      availability: { $in: ["Available Now", "Available Soon"] },
      isActive: true,
    })
      .select("firstName lastName avatar practiceAreas specializations availability")
      .lean();

    res.status(200).json({
      success: true,
      assignedParalegals,
      availableParalegals,
    });
  } catch (error) {
    console.error("Dashboard Info Error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard information",
    });
  }
};
