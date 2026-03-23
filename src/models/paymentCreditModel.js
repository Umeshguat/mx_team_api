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
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    otp: {
      type: String,
      default: null,
    },
    otp_expires: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PaymentCredit = mongoose.model("PaymentCredit", paymentCreditSchema);

module.exports = PaymentCredit;
