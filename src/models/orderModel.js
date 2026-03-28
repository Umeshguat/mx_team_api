const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryProduct",
      required: [true, "Product ID is required"],
    },
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    product_name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    product_code: {
      type: String,
      required: [true, "Product code is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unit_price: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    total_price: {
      type: Number,
      required: [true, "Total price is required"],
      min: [0, "Total price cannot be negative"],
    },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    order_number: {
      type: String,
      required: [true, "Order number is required"],
      unique: true,
      trim: true,
    },
    vendor_name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    vendor_mobile: {
      type: String,
      required: [true, "Vendor mobile is required"],
      trim: true,
    },
    vendor_address: {
      type: String,
      trim: true,
      default: "",
    },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: function (v) {
          return v.length > 0;
        },
        message: "Order must have at least one item",
      },
    },
    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },
    tax: {
      type: Number,
      default: 0,
      min: [0, "Tax cannot be negative"],
    },
    grand_total: {
      type: Number,
      required: [true, "Grand total is required"],
      min: [0, "Grand total cannot be negative"],
    },
    order_status: {
      type: String,
      required: [true, "Order status is required"],
      enum: {
        values: ["pending", "confirmed", "dispatched", "delivered", "cancelled"],
        message:
          "Order status must be pending, confirmed, dispatched, delivered, or cancelled",
      },
      default: "pending",
    },
    payment_status: {
      type: String,
      required: [true, "Payment status is required"],
      enum: {
        values: ["unpaid", "partial", "paid"],
        message: "Payment status must be unpaid, partial, or paid",
      },
      default: "unpaid",
    },
    payment_mode: {
      type: String,
      enum: {
        values: ["cash", "upi", "bank_transfer", "cheque", "credit"],
        message:
          "Payment mode must be cash, upi, bank_transfer, cheque, or credit",
      },
      default: "cash",
    },
    note: {
      type: String,
      trim: true,
      default: "",
    },
    order_date: {
      type: Date,
      default: Date.now,
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
          type: [Number], // [longitude, latitude]
          default: [0, 0],
        },
      },
    },
    delivered_date: {
      type: Date,
      default: null,
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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

orderSchema.index({ "delivery_address.location": "2dsphere" });

// Calculate subtotal from items
orderSchema.methods.calculateTotals = function () {
  this.subtotal = this.items.reduce((sum, item) => sum + item.total_price, 0);
  this.grand_total = this.subtotal - this.discount + this.tax;
  return this.grand_total;
};

const Order = mongoose.model("Order", orderSchema);

module.exports = Order;
