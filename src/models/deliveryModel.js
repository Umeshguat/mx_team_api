const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    order_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order ID is required"],
    },
    order_number: {
      type: String,
      required: [true, "Order number is required"],
      trim: true,
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned employee is required"],
    },
    vendor_name: {
      type: String,
      trim: true,
      default: "",
    },
    vendor_mobile: {
      type: String,
      trim: true,
      default: "",
    },
    delivery_address: {
      address: {
        type: String,
        trim: true,
        default: "",
      },
      city: {
        type: String,
        trim: true,
        default: "",
      },
      state: {
        type: String,
        trim: true,
        default: "",
      },
      pincode: {
        type: String,
        trim: true,
        default: "",
      },
      location: {
        type: {
          type: String,
          enum: ["Point"],
          default: "Point",
        },
        coordinates: {
          type: [Number],
          default: [0, 0],
        },
      },
    },
    delivery_status: {
      type: String,
      enum: {
        values: ["assigned", "picked_up", "in_transit", "delivered", "failed", "returned"],
        message:
          "Delivery status must be assigned, picked_up, in_transit, delivered, failed, or returned",
      },
      default: "assigned",
    },
    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high", "urgent"],
        message: "Priority must be low, medium, high, or urgent",
      },
      default: "medium",
    },
    scheduled_date: {
      type: Date,
      default: null,
    },
    picked_up_at: {
      type: Date,
      default: null,
    },
    delivered_at: {
      type: Date,
      default: null,
    },
    delivery_proof: {
      image_url: {
        type: String,
        trim: true,
        default: "",
      },
      signature_url: {
        type: String,
        trim: true,
        default: "",
      },
      received_by: {
        type: String,
        trim: true,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

deliverySchema.index({ "delivery_address.location": "2dsphere" });

const Delivery = mongoose.model("Delivery", deliverySchema);

module.exports = Delivery;
