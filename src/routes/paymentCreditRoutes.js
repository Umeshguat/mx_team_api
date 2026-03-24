const express = require("express");
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  createPaymentCredit,
  getAllPaymentCredits,
  getMyPaymentCredits,
  getPaymentCreditById,
  updatePaymentCredit,
  recordPayment,
  deletePaymentCredit,
  getOverdueCredits,
  getVendorCredits,
  getPaymentCreditDashboard,
  getSalesmanCreditReport,
  getVendorCreditReport,
} = require("../controllers/paymentCreditController");

const router = express.Router();

// All routes require authentication
router.use(protect);

// Dashboard & Reports
router.get("/dashboard/summary", getPaymentCreditDashboard);
router.get("/dashboard/salesman-report", getSalesmanCreditReport);
router.get("/dashboard/vendor-report", getVendorCreditReport);

// Overdue credits
router.get("/overdue", getOverdueCredits);

// My credits (logged-in salesman)
router.get("/my-credits", getMyPaymentCredits);

// Vendor-specific credits
router.get("/vendor/:vendorMobile", getVendorCredits);

// Payment Credit CRUD
router.route("/").get(getAllPaymentCredits).post(createPaymentCredit);
router
  .route("/:id")
  .get(getPaymentCreditById)
  .put(updatePaymentCredit)
  .delete(deletePaymentCredit);

// Record payment (partial/full)
router.post("/:id/pay", recordPayment);

module.exports = router;
