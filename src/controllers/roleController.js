const RoleMaster = require("../models/roleMasterModel");

// @desc    Create a new role
// @route   POST /api/admin/roles
const createRole = async (req, res) => {
  try {
    const { role_name } = req.body;

    const roleExists = await RoleMaster.findOne({ role_name });
    if (roleExists) {
      return res.status(400).json({ message: "Role already exists" });
    }

    const role = await RoleMaster.create({ role_name });
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all roles
// @route   GET /api/admin/roles
const getRoles = async (req, res) => {
  try {
    const roles = await RoleMaster.find().sort({ createdAt: -1 });

    res.status(200).json({
      status: 200,
      message: "Roles retrieved successfully",
      data: roles,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message
    });
  }
};

// @desc    Get role by ID
// @route   GET /api/admin/roles/:id
const getRoleById = async (req, res) => {
  try {
    const role = await RoleMaster.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }
    res.json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a role
// @route   PUT /api/admin/roles/:id
const updateRole = async (req, res) => {
  try {
    const role = await RoleMaster.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    role.role_name = req.body.role_name ?? role.role_name;
    role.status = req.body.status ?? role.status;

    const updatedRole = await role.save();
    res.json(updatedRole);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a role
// @route   DELETE /api/admin/roles/:id
const deleteRole = async (req, res) => {
  try {
    const role = await RoleMaster.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    await role.deleteOne();
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createRole, getRoles, getRoleById, updateRole, deleteRole };
