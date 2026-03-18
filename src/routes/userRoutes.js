const express = require("express");
const { register, login, updateProfile, getDailyAllowanceByUser, getUserDetails, forgotPassword, verifyOtp, resetPassword, getTeamProfiles, getEmployeeList, getAttendanceList } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.put("/profile", protect, updateProfile);

// User Details
router.get("/details", protect, getUserDetails);

// Daily Allowance
router.get("/daily-allowance", protect, getDailyAllowanceByUser);

// Team Profiles (based on designation permission hierarchy)
router.get("/team-profiles", protect, getTeamProfiles);

// Dashboard (single API for both Admin & Employee)
router.get("/dashboard", protect, getDashboard);

// Employee List with pagination (default limit: 5)
router.get("/employee-list", protect, getEmployeeList);

// Attendance List with pagination (default limit: 5)
router.get("/attendance-list", protect, getAttendanceList);

module.exports = router;
