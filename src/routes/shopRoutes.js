const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  createShop,
  getShops,
  getShopById,
  updateShop,
  deleteShop,
} = require("../controllers/shopMasterController");

// All shop routes require authentication + admin role
router.use(protect, isAdmin);

router.route("/").get(getShops).post(createShop);
router.route("/:id").get(getShopById).put(updateShop).delete(deleteShop);

module.exports = router;
