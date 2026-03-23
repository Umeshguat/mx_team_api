const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const paymentCreditSchema = new mongoose.Schema(
  {
    vendor_name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    order_id: {
      type: String,
      required: [true, "Order ID is required"],
      lowercase: true,
    },
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatchMaster",
      required: [false, "Batch ID is required"],
    },
    total_amount: {
      type: Number,
      required: [true, "Total amount is required"],
    },
    paid_amount: {
      type: Number,
      required: [true, "Paid amount is required"],
    },
    remaining_amount: {
      type: Number,
      required: [true, "Remaining amount is required"],
    },
    payment_status: {
      type: String,
      required: [true, "Payment status is required"],
      enum: ["pending", "partial", "paid"],
      default: "pending",
    }
  },
  {
    timestamps: true,
  }
);

const PaymentCredit = mongoose.model("PaymentCredit", paymentCreditSchema);

module.exports = PaymentCredit;
