const mongoose = require("mongoose");

const paymentHistorySchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Payment amount cannot be negative"],
    },
    payment_mode: {
      type: String,
      required: [true, "Payment mode is required"],
      enum: {
        values: ["cash", "upi", "bank_transfer", "cheque"],
        message: "Payment mode must be cash, upi, bank_transfer, or cheque",
      },
    },
    transaction_reference: {
      type: String,
      trim: true,
      default: "",
    },
    payment_date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    received_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { _id: true }
);

const paymentCreditSchema = new mongoose.Schema(
  {
    vendor_name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    vendor_mobile: {
      type: String,
      trim: true,
      default: "",
    },
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
    },
    invoice_number: {
      type: String,
      trim: true,
      default: "",
    },
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BatchMaster",
      required: false,
    },
    total_amount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },
    paid_amount: {
      type: Number,
      default: 0,
      min: [0, "Paid amount cannot be negative"],
    },
    remaining_amount: {
      type: Number,
      default: 0,
      min: [0, "Remaining amount cannot be negative"],
    },
    payment_mode: {
      type: String,
      enum: {
        values: ["cash", "upi", "bank_transfer", "cheque"],
        message: "Payment mode must be cash, upi, bank_transfer, or cheque",
      },
      default: "cash",
    },
    transaction_reference: {
      type: String,
      trim: true,
      default: "",
    },
    payment_status: {
      type: String,
      required: [true, "Payment status is required"],
      enum: {
        values: ["pending", "partial", "paid", "overdue"],
        message: "Payment status must be pending, partial, paid, or overdue",
      },
      default: "pending",
    },
    due_date: {
      type: Date,
      default: null,
    },
    payment_date: {
      type: Date,
      default: null,
    },
    payment_history: {
      type: [paymentHistorySchema],
      default: [],
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by user ID is required"],
    },
  },
  {
    timestamps: true,
  }
);

// Auto-calculate remaining_amount before saving
paymentCreditSchema.pre("save", function (next) {
  this.remaining_amount = this.total_amount - this.paid_amount;
  if (this.remaining_amount <= 0) {
    this.remaining_amount = 0;
    this.payment_status = "paid";
  } else if (this.paid_amount > 0) {
    this.payment_status = "partial";
  }
  next();
});

const PaymentCredit = mongoose.model("PaymentCredit", paymentCreditSchema);

module.exports = PaymentCredit;
