const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const Task = require('../models/Task');
const Paralegal = require('../models/Paralegal');
// controllers/adminController.js
const crypto = require('crypto');
const { sendBrevoEmailApi } = require('../lib/emailBrevoSdk');

// ✅ Updated Helper: Now accepts and encodes the role
const signToken = (id, role) => {
  return jwt.sign(
    { id, role }, 
    process.env.JWT_SECRET, 
    { expiresIn: '1d' }
  );
};

/**
 * @desc    Login Admin
 * @route   POST /api/admin/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("Login attempt for:", email);
    
    // Find admin and explicitly include password for comparison
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated' });
    }

    // ✅ Pass both ID and Role to the token
    const token = signToken(admin._id, admin.role);

    // Update last login timestamp
    admin.lastLogin = Date.now();
    await admin.save({ validateBeforeSave: false });

    res.status(200).json({ 
      success: true, 
      token, 
      data: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role 
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new Admin (Only Root Admin can do this)
 */
exports.createAdmin = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Admin already exists" });

    const newAdmin = await Admin.create({
      fullName,
      email,
      password,
      role: 'admin' // Root cannot create another Root via this endpoint
    });

    res.status(201).json({ 
      success: true, 
      data: { id: newAdmin._id, email: newAdmin.email, role: newAdmin.role } 
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get all admins
 */
exports.getAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort('-createdAt');
    res.status(200).json({ success: true, count: admins.length, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


/**
 * @desc    Update Admin Details or Password
 * @route   PATCH /api/admin/:id
 */
exports.updateAdmin = async (req, res) => {
  try {
    const { fullName, email, password, isActive } = req.body;
    const admin = await Admin.findById(req.params.id);

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    // Prevent standard admins from updating other admins
    if (req.user.role !== 'root' && req.user._id.toString() !== req.params.id) {
        return res.status(403).json({ message: "Unauthorized" });
    }

    if (fullName) admin.fullName = fullName;
    if (email) admin.email = email;
    if (isActive !== undefined) admin.isActive = isActive;
    
    // If password is provided, the 'pre-save' hook in the model will hash it
    if (password) admin.password = password;

    await admin.save();

    res.status(200).json({ success: true, message: "Admin updated successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete Admin
 * @route   DELETE /api/admin/:id
 */
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    if (admin.role === 'root') return res.status(403).json({ message: "Root admin cannot be deleted" });

    await admin.deleteOne();
    res.status(200).json({ success: true, message: "Admin deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get aggregated statistics for dashboard
 * @route   GET /api/admin/stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Run counts in parallel for better performance
    const [pendingTasks, availableParalegals, completedTasks] = await Promise.all([
      Task.countDocuments({ status: 'Pending Assignment' }),
      Paralegal.countDocuments({ isActive: true, availability: 'Available Now' }),
      Task.countDocuments({ status: 'Completed' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        pending: pendingTasks,
        activeParalegals: availableParalegals,
        completed: completedTasks
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'No admin found with that email address.' });
    }

    // 1. Generate reset token
    const resetToken = admin.createPasswordResetToken();
    await admin.save({ validateBeforeSave: false });

    // 2. Send it via Brevo
    const resetURL = `${process.env.ADMIN_FRONTEND_URL}/reset-password/${resetToken}`;

    const htmlContent = `
      <h1>Password Reset Request</h1>
      <p>You requested a password reset. Please click the link below to reset your password. This link is valid for 1 hour.</p>
      <a href="${resetURL}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; rounded: 5px;">Reset Password</a>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    await sendBrevoEmailApi({
      to_email: { email: admin.email, name: admin.fullName },
      email_subject: 'Admin Password Reset (Valid for 1 hour)',
      htmlContent
    });

    res.status(200).json({ success: true, message: 'Token sent to email!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    // 1. Get admin based on hashed token
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ success: false, message: 'Token is invalid or has expired.' });
    }

    // 2. Update password and clear reset fields
    admin.password = req.body.password;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();

    res.status(200).json({ success: true, message: 'Password reset successful!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};