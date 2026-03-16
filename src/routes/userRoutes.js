const express = require("express");
const { register, login, updateProfile } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");
const { getDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/profile", protect, updateProfile);

// Dashboard (single API for both Admin & Employee)
router.get("/dashboard", protect, getDashboard);

module.exports = router;
