const DesignationMaster = require("../models/designationMasterModel");

// @desc    Create a new designation
// @route   POST /api/admin/designations
const createDesignation = async (req, res) => {
  try {
    const { designation_name } = req.body;

    const exists = await DesignationMaster.findOne({ designation_name });
    if (exists) {
      return res.status(400).json({ message: "Designation already exists" });
    }

    const designation = await DesignationMaster.create({ designation_name });
    res.status(201).json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all designations
// @route   GET /api/admin/designations
const getDesignations = async (req, res) => {
  try {
    const designations = await DesignationMaster.find().sort({ createdAt: -1 });
    res.json(designations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get designation by ID
// @route   GET /api/admin/designations/:id
const getDesignationById = async (req, res) => {
  try {
    const designation = await DesignationMaster.findById(req.params.id);
    if (!designation) {
      return res.status(404).json({ message: "Designation not found" });
    }
    res.json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a designation
// @route   PUT /api/admin/designations/:id
const updateDesignation = async (req, res) => {
  try {
    const designation = await DesignationMaster.findById(req.params.id);
    if (!designation) {
      return res.status(404).json({ message: "Designation not found" });
    }

    designation.designation_name = req.body.designation_name ?? designation.designation_name;
    designation.status = req.body.status ?? designation.status;

    const updated = await designation.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a designation
// @route   DELETE /api/admin/designations/:id
const deleteDesignation = async (req, res) => {
  try {
    const designation = await DesignationMaster.findById(req.params.id);
    if (!designation) {
      return res.status(404).json({ message: "Designation not found" });
    }

    await designation.deleteOne();
    res.json({ message: "Designation deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createDesignation,
  getDesignations,
  getDesignationById,
  updateDesignation,
  deleteDesignation,
};
