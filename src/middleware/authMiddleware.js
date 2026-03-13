const jwt = require("jsonwebtoken");
const User = require("../models/userModel");

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized, token invalid" });
  }
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).populate("role_id");

    console.log("User role:", user.role_id ? user.role_id.role_name : "No role");
    if (!user || !user.role_id || user.role_id.role_name !== "Admin") {
      return res.status(403).json({ message: "Access denied, admin only" });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = { protect, isAdmin };
