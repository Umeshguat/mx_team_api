const mongoose = require("mongoose");

const categoryMasterSchema = new mongoose.Schema(
  {
    category_name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },
    status: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const CategoryMaster = mongoose.model("CategoryMaster", categoryMasterSchema);

module.exports = CategoryMaster;
