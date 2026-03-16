const mongoose = require("mongoose");

const allowanceMasterSchema = new mongoose.Schema(
  {
    designation_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DesignationMaster",
      required: [true, "Designation ID is required"],
      unique: true,
    },
    per_km: {
      type: Number,
      required: [true, "Per KM allowance is required"],
      default: 0,
    },
    daily_allowance: {
      type: Number,
      required: [true, "Daily allowance is required"],
      default: 0,
    },
    out_of_town_food: {
      type: Number,
      required: [true, "Out of town food allowance is required"],
      default: 0,
    },
    ways_stay_allowance: {
      type: Number,
      required: [true, "Ways stay allowance is required"],
      default: 0,
    },
    other_expenses: {
      type: Number,
      required: [true, "Other expenses allowance is required"],
      default: 0,
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

const AllowanceMaster = mongoose.model("AllowanceMaster", allowanceMasterSchema);

module.exports = AllowanceMaster;
