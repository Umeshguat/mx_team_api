const express = require("express");
const {
  addSalesEmployee,
  addDeliveryEmployee,
  updateEmployee,
  listSalesEmployees,
  listDeliveryEmployees,
  deleteEmployee,
} = require("../controllers/employeeController");
const { protect } = require("../middleware/authMiddleware");
const { uploadFields } = require("../middleware/uploadMiddleware");

const profileImageUpload = uploadFields([{ name: "profile_image", maxCount: 1 }]);

const router = express.Router();

// Add Sales employee
router.post("/sales", protect, profileImageUpload, addSalesEmployee);

// List Sales employees
router.get("/sales", protect, listSalesEmployees);

// Add Delivery employee
router.post("/delivery", protect, profileImageUpload, addDeliveryEmployee);

// List Delivery employees
router.get("/delivery", protect, listDeliveryEmployees);

// Update employee (sales / delivery / any)
router.put("/:id", protect, profileImageUpload, updateEmployee);

// Delete employee
router.delete("/:id", protect, deleteEmployee);

module.exports = router;
