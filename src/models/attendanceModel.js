const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },

    // Check-in details
    check_in_time: {
      type: Date,
      required: [true, "Check-in time is required"],
    },
    check_in_km: {
      type: Number,
      required: [true, "Check-in KM is required"],
    },
    check_in_image: {
      type: String,
      required: [true, "Check-in KM image is required"],
    },
    selfie_image: {
      type: String,
      required: [true, "Selfie image is required"],
    },

    // Check-out details
    check_out_time: {
      type: Date,
      default: null,
    },
    check_out_km: {
      type: Number,
      default: null,
    },
    check_out_image: {
      type: String,
      default: null,
    },

    // Location details
    headquarter_name: {
      type: String,
      required: [true, "Headquarter name is required"],
      trim: true,
    },
    working_town: {
      type: String,
      required: [true, "Working town is required"],
      trim: true,
    },
    route: {
      type: String,
      required: [true, "Route is required"],
      trim: true,
    },

    // Stay details
    stay_image: {
      type: String,
      default: null,
    },
    stay_amount: {
      type: Number,
      default: 0,
    },

    // Food details
    food_amount: {
      type: Number,
      default: 0,
    },
    food_image: {
      type: String,
      default: null,
    },

    // Other expenses
    other_amount: {
      type: Number,
      default: 0,
    },
    other_image: {
      type: String,
      default: null,
    },

    // Status
    status: {
      type: String,
      enum: ["checked_in", "checked_out"],
      default: "checked_in",
    },
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;
