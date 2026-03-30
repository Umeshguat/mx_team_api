const express = require("express");
const { register, login, updateProfile, getDailyAllowanceByUser, getUserDetails, forgotPassword, verifyOtp, resetPassword, getTeamProfiles, getEmployeeList, getAttendanceList, uploadProfileImage } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");
const { uploadFields } = require("../middleware/uploadMiddleware");

const profileImageUpload = uploadFields([{ name: "profile_image", maxCount: 1 }]);

const router = express.Router();

router.post("/register", profileImageUpload, register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.put("/profile", protect, profileImageUpload, updateProfile);
router.put("/profile-image", protect, profileImageUpload, uploadProfileImage);

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
