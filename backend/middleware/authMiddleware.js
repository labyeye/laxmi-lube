const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (error) {
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }
  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};
const staffOnly = (req, res, next) => {
  if (req.user && req.user.role === "staff") {
    next();
  } else {
    res.status(403).json({ message: "Access denied, staff only" });
  }
};
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Access denied, admin only" });
  }
};

const retailerOnly = (req, res, next) => {
  if (req.user && req.user.role === "retailer") {
    next();
  } else {
    res.status(403).json({ message: "Access denied, retailer only" });
  }
};

// Permission checking middleware
const checkPermission = (module, action) => {
  return (req, res, next) => {
    // Admins have full access
    if (req.user && req.user.role === "admin") {
      return next();
    }

    // Check if user has specific permission
    if (
      req.user &&
      req.user.permissions &&
      req.user.permissions[module] &&
      req.user.permissions[module][action] === true
    ) {
      return next();
    }

    res.status(403).json({ 
      message: `Access denied. You don't have permission to ${action} ${module}` 
    });
  };
};

module.exports = { protect, adminOnly, staffOnly, retailerOnly, checkPermission };
