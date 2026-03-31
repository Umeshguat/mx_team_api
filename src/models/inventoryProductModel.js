const mongoose = require("mongoose");

const batchSchema = new mongoose.Schema(
  {
    batch_number: {
      type: String,
      required: [true, "Batch number is required"],
      trim: true,
    },
    manufacturing_date: {
      type: Date,
      required: [true, "Manufacturing date is required"],
    },
    expiry_date: {
      type: Date,
      required: [true, "Expiry date is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Batch quantity is required"],
      min: [0, "Quantity cannot be negative"],
    },
    purchase_price: {
      type: Number,
      required: [true, "Purchase price is required"],
      min: [0, "Purchase price cannot be negative"],
    },
    is_active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true, timestamps: true }
);

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
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BrandMaster",
      required: [true, "Brand is required"],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CategoryMaster",
      required: [true, "Category is required"],
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
    selling_price: {
      type: Number,
      required: [true, "Selling price is required"],
      min: [0, "Selling price cannot be negative"],
    },
    total_quantity: {
      type: Number,
      default: 0,
      min: [0, "Total quantity cannot be negative"],
    },
    reorder_level: {
      type: Number,
      required: [true, "Reorder level is required"],
      min: [0, "Reorder level cannot be negative"],
    },
    shelf_life_days: {
      type: Number,
      required: [true, "Shelf life in days is required"],
      min: [1, "Shelf life must be at least 1 day"],
    },
    batches: [batchSchema],
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

// Virtual: compute total_quantity from active batches
inventoryProductSchema.methods.recalculateQuantity = function () {
  this.total_quantity = this.batches
    .filter((b) => b.is_active)
    .reduce((sum, b) => sum + b.quantity, 0);
  return this.total_quantity;
};

// Virtual: check if stock is below reorder level
inventoryProductSchema.methods.isLowStock = function () {
  return this.total_quantity <= this.reorder_level;
};

// Virtual: get expiry status for each batch
inventoryProductSchema.methods.getBatchExpiryStatus = function () {
  const now = new Date();
  return this.batches
    .filter((b) => b.is_active)
    .map((b) => {
      const daysToExpiry = Math.ceil(
        (b.expiry_date - now) / (1000 * 60 * 60 * 24)
      );
      let status = "green"; // > 60 days
      if (daysToExpiry <= 0) status = "expired";
      else if (daysToExpiry <= 30) status = "red";
      else if (daysToExpiry <= 60) status = "yellow";
      return {
        batch_id: b._id,
        batch_number: b.batch_number,
        expiry_date: b.expiry_date,
        days_to_expiry: daysToExpiry,
        status,
        quantity: b.quantity,
      };
    });
};

const InventoryProduct = mongoose.model(
  "InventoryProduct",
  inventoryProductSchema
);

module.exports = InventoryProduct;
