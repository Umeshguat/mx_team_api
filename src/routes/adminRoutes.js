const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
} = require("../controllers/roleController");
const {
  createDesignation,
  getDesignations,
  getDesignationById,
  updateDesignation,
  deleteDesignation,
} = require("../controllers/designationController");
const {
  createAllowance,
  getAllowances,
  getAllowanceById,
  updateAllowance,
  deleteAllowance,
} = require("../controllers/allowanceController");

// All admin routes require authentication + admin role
router.use(protect, isAdmin);

// Role routes
router.route("/roles").get(getRoles).post(createRole);
router.route("/roles/:id").get(getRoleById).put(updateRole).delete(deleteRole);

// Designation routes
router.route("/designations").get(getDesignations).post(createDesignation);
router
  .route("/designations/:id")
  .get(getDesignationById)
  .put(updateDesignation)
  .delete(deleteDesignation);

// Allowance routes
router.route("/allowances").get(getAllowances).post(createAllowance);
router
  .route("/allowances/:id")
  .get(getAllowanceById)
  .put(updateAllowance)
  .delete(deleteAllowance);

module.exports = router;
