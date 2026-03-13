const express = require("express");
const { register, login, updateProfile } = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.put("/profile", protect, updateProfile);

module.exports = router;
