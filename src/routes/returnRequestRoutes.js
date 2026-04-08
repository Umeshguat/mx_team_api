const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createReturnRequest } = require("../controllers/returnRequestController");

const router = express.Router();


router.use(protect);

router.post("/", createReturnRequest);

module.exports = router;