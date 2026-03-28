const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  getDashboardData,
  createDelivery,
  getAllDeliveries,
  getMyDeliveries,
  getDeliveryById,
  updateDelivery,
  updateDeliveryStatus,
  deleteDelivery,
} = require("../controllers/deliveryController");

const router = express.Router();

// All routes require authentication
router.use(protect);

//dashboard
router.get("/dashboard", getDashboardData);
// My deliveries (logged-in employee)
router.post("/my-deliveries", getMyDeliveries);

// Delivery CRUD
router.route("/").get(getAllDeliveries).post(createDelivery);
router.route("/:id").get(getDeliveryById).put(updateDelivery).delete(deleteDelivery);

// Status update
router.put("/:id/status", updateDeliveryStatus);

module.exports = router;
