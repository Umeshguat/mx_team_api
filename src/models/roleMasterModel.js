const mongoose = require("mongoose");

const roleMasterSchema = new mongoose.Schema(
  {
    role_name: {
      type: String,
      required: [true, "Role name is required"],
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

const RoleMaster = mongoose.model("RoleMaster", roleMasterSchema);

module.exports = RoleMaster;
