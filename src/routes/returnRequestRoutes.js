const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { createReturnRequest, getReturnRequestsForDistributor, updateReturnRequestStatus, receiveReturnedProduct, completeRefund, getReturnRequestById, getReturnRequestsForSalesperson,
    getReturnRequestsForDeliveryPerson, getPickupByID
 } = require("../controllers/returnRequestController");

const router = express.Router();


router.use(protect);

router.get("/distributor", getReturnRequestsForDistributor);
router.get("/sales", getReturnRequestsForSalesperson);
router.get("/pickup", getReturnRequestsForDeliveryPerson);
router.get("/pickup/:id", getPickupByID);
router.get("/:id", getReturnRequestById);
router.put("/:id/status", updateReturnRequestStatus);
router.put("/:id/receive", receiveReturnedProduct);
router.put("/:id/complete-refund", completeRefund);
router.post("/", createReturnRequest);

module.exports = router;