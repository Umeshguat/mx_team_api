const express = require("express");
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");
const { uploadFields } = require("../middleware/uploadMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Check-in with image uploads
router.post(
  "/check-in",
  uploadFields([
    { name: "check_in_image", maxCount: 1 },
    { name: "selfie_image", maxCount: 1 },
    { name: "stay_image", maxCount: 1 },
    { name: "food_image", maxCount: 1 },
    { name: "other_image", maxCount: 1 },
  ]),
  checkIn
);

// Check-out with image uploads (auto-finds today's active check-in)
router.post(
  "/check-out",
  uploadFields([
    { name: "check_out_image", maxCount: 1 },
    { name: "selfie_image", maxCount: 1 },
    { name: "stay_image", maxCount: 1 },
    { name: "food_image", maxCount: 1 },
    { name: "other_image", maxCount: 1 },
  ]),
  checkOut
);

// Get today's attendance
router.get("/today", getTodayAttendance);

// Get attendance history
router.get("/history", getAttendanceHistory);

module.exports = router;
