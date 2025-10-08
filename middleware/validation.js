// middleware/validation.js

// Validate registration input
exports.validateRegistration = (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const errors = [];

  // Check required fields
  if (!firstName || firstName.trim() === '') {
    errors.push('First name is required');
  }

  if (!lastName || lastName.trim() === '') {
    errors.push('Last name is required');
  }

  if (!email || email.trim() === '') {
    errors.push('Email is required');
  } else if (!/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    errors.push('Please provide a valid email');
  }

  if (!password) {
    errors.push('Password is required');
  } else if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Validate login input
exports.validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  const errors = [];

  if (!email || email.trim() === '') {
    errors.push('Email is required');
  }

  if (!password) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Validate profile completion
exports.validateProfileCompletion = (req, res, next) => {
  const { phone, firmName, barNumber, barState } = req.body;

  const errors = [];

  if (!phone || phone.trim() === '') {
    errors.push('Phone number is required');
  } else if (!/^[\+]?[(]?[0-9]{1,3}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,4}[-\s\.]?[0-9]{1,9}$/.test(phone)) {
    errors.push('Please provide a valid phone number');
  }

  if (!firmName || firmName.trim() === '') {
    errors.push('Firm name is required');
  }

  if (!barNumber || barNumber.trim() === '') {
    errors.push('Bar number is required');
  }

  if (!barState || barState.trim() === '') {
    errors.push('Bar state is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};

// Validate email format
exports.validateEmail = (req, res, next) => {
  const { email } = req.body;

  if (!email || !/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email'
    });
  }

  next();
};

// Validate password change
exports.validatePasswordChange = (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const errors = [];

  if (!currentPassword) {
    errors.push('Current password is required');
  }

  if (!newPassword) {
    errors.push('New password is required');
  } else if (newPassword.length < 8) {
    errors.push('New password must be at least 8 characters');
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
    errors.push('New password must contain at least one uppercase letter, one lowercase letter, and one number');
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push('New password must be different from current password');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }

  next();
};
