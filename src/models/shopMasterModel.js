const mongoose = require("mongoose");

const shopMasterSchema = new mongoose.Schema(
  {
    distributor_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Distributor ID is required"],
    },
    shop_name: {
      type: String,
      required: [true, "Shop name is required"],
      trim: true,
    },
    shop_mobile: {
      type: String,
      required: [true, "Shop mobile is required"],
      trim: true,
    },
    shop_address: {
      type: String,
      required: [true, "Shop address is required"],
    },
    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, "Latitude is required"],
    },
    longitude: {
      type: Number,
      required: [true, "Longitude is required"],
    }
  },
  {
    timestamps: true,
  }
);

const ShopMaster = mongoose.model("ShopMaster", shopMasterSchema);

module.exports = ShopMaster;
