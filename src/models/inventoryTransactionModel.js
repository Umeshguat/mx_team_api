const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
  {
    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryProduct",
      required: [true, "Product ID is required"],
    },
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Batch ID is required"],
    },
    transaction_type: {
      type: String,
      required: [true, "Transaction type is required"],
      enum: {
        values: ["stock_in", "stock_out", "adjustment"],
        message: "Transaction type must be stock_in, stock_out, or adjustment",
      },
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    balance_after: {
      type: Number,
      required: [true, "Balance after transaction is required"],
    },
    reference: {
      type: String,
      trim: true,
      default: "",
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

const InventoryTransaction = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);

module.exports = InventoryTransaction;
