const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const returnRequestSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: [true, "Order ID is required"],
      trim: true,
    },
    sales_person_id: {
      type: String,
      required: [true, "Sales person ID is required"],
      trim: true,
      lowercase: true,
    },
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
    },
    reason: {
      type: String,
      required: [false, "Reason is required"],
    },
    status: {
      type: String,
      enum: ["requested", "approved", "rejected"],
      default: "requested",
    },
    recevied_date: {
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
      enum: ["pending", "processed"],
      default: "pending",
    }
  },
  {
    timestamps: true,
  }
);




const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);

module.exports = User;
