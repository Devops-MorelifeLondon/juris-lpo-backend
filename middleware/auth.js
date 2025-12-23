const jwt = require("jsonwebtoken");
const Attorney = require("../models/Attorney");
const Paralegal = require("../models/Paralegal");
const Admin = require("../models/Admin"); // Added Admin Model

exports.protect = async (req, res, next) => {
  try {
    let token = null;

    // 1. Extract Token (Header or Cookie)
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    // 2. Validate token presence
    if (!token || token === "undefined" || token === "null") {
      return res.status(401).json({ success: false, message: "Authentication required. Please log in." });
    }

    // 3. Verify Token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Find User based on Role
    let user = null;
    const role = decoded.role;

    switch (role) {
      case "root":
      case "admin":
        user = await Admin.findById(decoded.id).select("fullName email role isActive");
        break;
      case "attorney":
        user = await Attorney.findById(decoded.id).select("fullName email isActive");
        break;
      case "paralegal":
        user = await Paralegal.findById(decoded.id).select("firstName lastName email isActive");
        break;
      default:
        return res.status(401).json({ success: false, message: "Invalid user role in token" });
    }

    // 5. Security Checks: User existence and Active status
    if (!user) {
      return res.status(401).json({ success: false, message: "The user belonging to this token no longer exists." });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "This account has been deactivated." });
    }

    // 6. Attach to request object
    // We store the role explicitly from the database for Admins (to distinguish root/admin)
    req.user = user.toObject();
    req.user.role = role === 'root' || role === 'admin' ? user.role : role;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

/**
 * Role-based Authorization Middleware
 * @param  {...string} roles - e.g., 'root', 'admin', 'attorney'
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    console.log(req.user.role);
    console.log(roles);
    // req.user.role comes from the protect middleware above
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: "You do not have permission to perform this action" 
      });
    }
    next();
  };
};