const mongoose = require("mongoose");

const vendorVisitSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
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
    selfie_with_vendor: {
      type: String,
      required: [true, "Selfie with vendor is required"],
    },
    address_gps: {
      type: String,
      required: [true, "GPS address is required"],
      trim: true,
    },
    latitude: {
      type: Number,
      required: [true, "Latitude is required"],
    },
    longitude: {
      type: Number,
      required: [true, "Longitude is required"],
    },
    on_board: {
      type: Boolean,
      default: false,
    },
    visit_date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const VendorVisit = mongoose.model("VendorVisit", vendorVisitSchema);

module.exports = VendorVisit;
