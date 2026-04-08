const User = require("../models/userModel");
const RoleMaster = require("../models/roleMasterModel");
const { uploadToS3 } = require("../utils/s3Upload");

// Helper: resolve role id by name (case-insensitive)
const resolveRoleId = async (roleName) => {
  const role = await RoleMaster.findOne({
    role_name: { $regex: new RegExp(`^${roleName}$`, "i") },
  });
  return role ? role._id : null;
};

const createEmployeeByRole = (roleName) => async (req, res) => {
  try {
    const {
      full_name,
      email,
      designation_id,
      headquarter_name,
      phone_number,
      password,
      distributor_id,
    } = req.body;

    if (!full_name || !email || !headquarter_name || !phone_number || !password) {
      return res.status(400).json({
        status: 400,
        message: "full_name, email, headquarter_name, phone_number and password are required",
      });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ status: 400, message: "User already exists with this email" });
    }

    const role_id = await resolveRoleId(roleName);
    if (!role_id) {
      return res.status(400).json({ status: 400, message: `${roleName} role not found in RoleMaster` });
    }

    let profile_image = null;
    if (req.files && req.files.profile_image && req.files.profile_image.length > 0) {
      const file = req.files.profile_image[0];
      profile_image = await uploadToS3(file.buffer, file.originalname, file.mimetype, "profiles");
    }

    const user = await User.create({
      full_name,
      email,
      role_id,
      designation_id: designation_id || undefined,
      distributor_id: distributor_id || undefined,
      headquarter_name,
      phone_number,
      password,
      profile_image,
    });

    res.status(201).json({
      status: 201,
      message: `${roleName} employee created successfully`,
      data: {
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role_id: user.role_id,
        designation_id: user.designation_id,
        distributor_id: user.distributor_id,
        headquarter_name: user.headquarter_name,
        phone_number: user.phone_number,
        profile_image: user.profile_image,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Add Sales employee
// @route   POST /api/employees/sales
const addSalesEmployee = createEmployeeByRole("Sales");

// @desc    Add Delivery employee
// @route   POST /api/employees/delivery
const addDeliveryEmployee = createEmployeeByRole("Delivery Agent");

// @desc    Update employee (sales/delivery or any)
// @route   PUT /api/employees/:id
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 404, message: "Employee not found" });
    }

    const {
      full_name,
      email,
      role_id,
      designation_id,
      distributor_id,
      headquarter_name,
      phone_number,
      password,
    } = req.body;

    if (email && email !== user.email) {
      const exists = await User.findOne({ email });
      if (exists) {
        return res.status(400).json({ status: 400, message: "Email already in use" });
      }
      user.email = email;
    }

    if (full_name) user.full_name = full_name;
    if (role_id) user.role_id = role_id;
    if (designation_id) user.designation_id = designation_id;
    if (distributor_id) user.distributor_id = distributor_id;
    if (headquarter_name) user.headquarter_name = headquarter_name;
    if (phone_number) user.phone_number = phone_number;
    if (password) user.password = password;

    if (req.files && req.files.profile_image && req.files.profile_image.length > 0) {
      const file = req.files.profile_image[0];
      user.profile_image = await uploadToS3(file.buffer, file.originalname, file.mimetype, "profiles");
    }

    const updated = await user.save();

    res.status(200).json({
      status: 200,
      message: "Employee updated successfully",
      data: {
        _id: updated._id,
        full_name: updated.full_name,
        email: updated.email,
        role_id: updated.role_id,
        designation_id: updated.designation_id,
        distributor_id: updated.distributor_id,
        headquarter_name: updated.headquarter_name,
        phone_number: updated.phone_number,
        profile_image: updated.profile_image,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    List employees by role
const listEmployeesByRole = (roleName) => async (req, res) => {
  try {
    const role_id = await resolveRoleId(roleName);
    if (!role_id) {
      return res.status(400).json({ status: 400, message: `${roleName} role not found in RoleMaster` });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);
    const skip = (page - 1) * limit;

    const filter = { role_id };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .populate("role_id", "role_name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 200,
      message: `${roleName} employees fetched successfully`,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

const listSalesEmployees = listEmployeesByRole("Sales");
const listDeliveryEmployees = listEmployeesByRole("Delivery Agent");

// @desc    Delete employee
// @route   DELETE /api/employees/:id
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ status: 404, message: "Employee not found" });
    }
    await user.deleteOne();
    res.status(200).json({ status: 200, message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = {
  addSalesEmployee,
  addDeliveryEmployee,
  updateEmployee,
  listSalesEmployees,
  listDeliveryEmployees,
  deleteEmployee,
};
