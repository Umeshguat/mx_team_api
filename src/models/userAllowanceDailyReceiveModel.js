const mongoose = require("mongoose");

const userDailyAllowanceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    total_km: {
      type: Number,
      required: [true, "Total KM is required"],
      default: 0,
    },
    total_km_price: {
      type: Number,
      required: [true, "Total KM price is required"],
      default: 0,
    },
    food: {
      type: Number,
      required: [true, "Food allowance is required"],
      default: 0,
    },
    stay: {
      type: Number,
      required: [true, "Stay allowance is required"],
      default: 0,
    },
    other: {
      type: Number,
      required: [true, "Other allowance is required"],
      default: 0,
    },
    daily: {
      type: Number,
      required: [true, "Daily allowance is required"],
      default: 0,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

const UserDailyAllowance = mongoose.model(
  "UserDailyAllowance",
  userDailyAllowanceSchema
);

module.exports = UserDailyAllowance;
