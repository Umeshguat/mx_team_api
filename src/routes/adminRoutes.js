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
const {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
} = require("../controllers/brandController");
const {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");

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

// Category routes
router.route("/categories").get(getCategories).post(createCategory);
router
  .route("/categories/:id")
  .get(getCategoryById)
  .put(updateCategory)
  .delete(deleteCategory);

// Brand routes
router.route("/brands").get(getBrands).post(createBrand);
router
  .route("/brands/:id")
  .get(getBrandById)
  .put(updateBrand)
  .delete(deleteBrand);

module.exports = router;
