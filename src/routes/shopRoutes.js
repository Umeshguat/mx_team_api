const express = require("express");
const router = express.Router();
const { protect, isAdmin } = require("../middleware/authMiddleware");
const {
  createShop,
  getShops,
  getShopById,
  updateShop,
  deleteShop,
  searchShop,
} = require("../controllers/shopMasterController");

// All shop routes require authentication + admin role
router.use(protect);

router.post("/", createShop);
router.get("/search", searchShop);
router.get("/list", getShops);
router.route("/:id").get(getShopById).put(updateShop).delete(deleteShop);

module.exports = router;
