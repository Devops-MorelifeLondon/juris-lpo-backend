const jwt = require('jsonwebtoken');
const Attorney = require('../models/Attorney');
const Paralegal = require('../models/Paralegal');

exports.protect = async (req, res, next) => {
  try {
      let token;



     // 1. Check Authorization header first
 if (req.headers.authorization?.startsWith("Bearer ")) {
  token = req.headers.authorization.split(" ")[1];
} else if (req.cookies?.token) {
  token = req.cookies.token;
}
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let user;
    if (decoded.role === 'attorney') {
      user = await Attorney.findById(decoded.id).select('-password');
    } else if (decoded.role === 'paralegal') {
      user = await Paralegal.findById(decoded.id).select('-password');
    }

    if (!user) return res.status(404).json({ message: 'User not found' });

    req.user = user;
    req.role = decoded.role;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
