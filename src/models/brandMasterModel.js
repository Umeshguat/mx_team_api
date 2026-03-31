const mongoose = require("mongoose");

const brandMasterSchema = new mongoose.Schema(
  {
    brand_name: {
      type: String,
      required: [true, "Brand name is required"],
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

const BrandMaster = mongoose.model("BrandMaster", brandMasterSchema);

module.exports = BrandMaster;
