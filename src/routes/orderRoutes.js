const express = require("express");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrder,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
  getSalesDashboard,
  getSalesmanReport,
} = require("../controllers/orderController");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard & Reports
router.get("/dashboard/summary", getSalesDashboard);
router.get("/dashboard/salesman-report", getSalesmanReport);

// My orders (logged-in salesman)
router.get("/my-orders", getMyOrders);

// Order CRUD
router.route("/").get(getAllOrders).post(createOrder);
router.route("/:id").get(getOrderById).put(updateOrder).delete(deleteOrder);

// Status updates
router.put("/:id/status", updateOrderStatus);
router.put("/:id/payment", updatePaymentStatus);

module.exports = router;
