const express = require("express");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addBatch,
  stockOut,
  adjustStock,
  getLowStockAlerts,
  getNearExpiryAlerts,
  getStockAgingReport,
  getInventoryDashboard,
  getProductTransactions,
} = require("../controllers/inventoryController");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard
router.get("/dashboard", getInventoryDashboard);

// Alerts
router.get("/alerts/low-stock", getLowStockAlerts);
router.get("/alerts/near-expiry", getNearExpiryAlerts);

// Reports
router.get("/reports/stock-aging", getStockAgingReport);

// Product CRUD
router.route("/products").get(getAllProducts).post(createProduct);
router
  .route("/products/:id")
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

// Batch & Stock operations
router.post("/products/:id/batches", addBatch);
router.post("/products/:id/stock-out", stockOut);
router.post("/products/:id/adjust", adjustStock);

// Transaction history
router.get("/products/:id/transactions", getProductTransactions);

module.exports = router;
