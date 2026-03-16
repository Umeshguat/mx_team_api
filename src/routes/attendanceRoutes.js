const express = require("express");
const {
  checkIn,
  checkOut,
  getTodayAttendance,
  getAttendanceHistory,
} = require("../controllers/attendanceController");
const { protect } = require("../middleware/authMiddleware");
const { upload, handleMulterError } = require("../middleware/uploadMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Check-in with image uploads
router.post(
  "/check-in",
  (req, res, next) => {
    console.log("Before multer - req.body:", req.body);
    console.log("Before multer - req.headers content-type:", req.headers["content-type"]);
    next();
  },
  upload.fields([
    { name: "check_in_image", maxCount: 1 },
    { name: "selfie_image", maxCount: 1 },
    { name: "stay_image", maxCount: 1 },
    { name: "food_image", maxCount: 1 },
    { name: "other_image", maxCount: 1 },
  ]),
  handleMulterError,
  checkIn
);

// Check-out with image uploads (auto-finds today's active check-in)
router.post(
  "/check-out",
  upload.fields([
    { name: "check_out_image", maxCount: 1 },
    { name: "stay_image", maxCount: 1 },
    { name: "food_image", maxCount: 1 },
    { name: "other_image", maxCount: 1 },
  ]),
  handleMulterError,
  checkOut
);

// Get today's attendance
router.get("/today", getTodayAttendance);

// Get attendance history
router.get("/history", getAttendanceHistory);

module.exports = router;
