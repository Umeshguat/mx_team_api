const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const returnRequestSchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
      trim: true,
    },
    sales_person_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Sales person ID is required"],
    },
    shop_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopMaster",
      required: [true, "Shop ID is required"],
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryProduct",
      required: [true, "Product ID is required"],
    },
    reason: {
      type: String,
      required: [false, "Reason is required"],
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
    },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected" ,"picked_up", "received"],
      default: "requested",
    },
    quality_check_status: {
      type: String,
      enum: ["pending", "passed", "failed"],
      default: "pending",
    },
    quality_check_description: {
      type: String,
      required: [false, "Quality check report is required"],
    },
    received_date: {
      type: Date,
      required: [false, "Received date is required"],
    },
    pickup_date: {
      type: Date,
      required: [false, "Pickup date is required"],
    },
    refund_amount: {
      type: Number,
      required: [false, "Refund amount is required"],
      min: [0, "Refund amount cannot be negative"],
    },
    refund_status: {
      type: String,
      enum: ["pending", "processed","completed"],
      default: "pending",
    },
    delivery_agent_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);




const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);

module.exports = ReturnRequest;
