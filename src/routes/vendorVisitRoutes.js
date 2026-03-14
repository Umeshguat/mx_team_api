const express = require("express");
const {
  addVendorVisit,
  updateVendorVisit,
  deleteVendorVisit,
  getVendorVisitById,
  getAllVendorVisits,
} = require("../controllers/vendorVisitController");
const { protect } = require("../middleware/authMiddleware");
const { upload, handleMulterError } = require("../middleware/uploadMiddleware");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Add vendor visit
router.post(
  "/",
  upload.fields([{ name: "selfie_with_vendor", maxCount: 1 }]),
  handleMulterError,
  addVendorVisit
);

// Update vendor visit (id sent in body)
router.post(
  "/update",
  upload.fields([{ name: "selfie_with_vendor", maxCount: 1 }]),
  handleMulterError,
  updateVendorVisit
);

// Delete vendor visit
router.delete("/:id", deleteVendorVisit);

// Get all vendor visits
router.get("/", getAllVendorVisits);

// Get vendor visit by ID
router.get("/:id", getVendorVisitById);

module.exports = router;
