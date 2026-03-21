const mongoose = require("mongoose");

const inventoryProductSchema = new mongoose.Schema(
  {
    product_name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    product_code: {
      type: String,
      required: [true, "Product code is required"],
      unique: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    unit: {
      type: String,
      required: [true, "Unit is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    image: {
      type: String,
      default: null,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const InventoryProduct = mongoose.model("InventoryProduct", inventoryProductSchema);

module.exports = InventoryProduct;
