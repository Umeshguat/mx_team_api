const mongoose = require("mongoose");

const designationMasterSchema = new mongoose.Schema(
  {
    designation_name: {
      type: String,
      required: [true, "Designation name is required"],
      unique: true,
      trim: true,
    },
    permission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DesignationMaster",
      default: null,
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

const DesignationMaster = mongoose.model("DesignationMaster", designationMasterSchema);

module.exports = DesignationMaster;
