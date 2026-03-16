const AllowanceMaster = require("../models/allowanceMasterModel");

// @desc    Create a new allowance
// @route   POST /api/admin/allowances
const createAllowance = async (req, res) => {
  try {
    const { designation_id, per_km, daily_allowance, out_of_town_food, ways_stay_allowance, other_expenses } = req.body;

    const exists = await AllowanceMaster.findOne({ designation_id });
    if (exists) {
      return res.status(400).json({ message: "Allowance for this designation already exists" });
    }

    const allowance = await AllowanceMaster.create({
      designation_id,
      per_km,
      daily_allowance,
      out_of_town_food,
      ways_stay_allowance,
      other_expenses,
    });

    res.status(201).json(allowance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all allowances
// @route   GET /api/admin/allowances
const getAllowances = async (req, res) => {
  try {
    const allowances = await AllowanceMaster.find()
      .populate("designation_id", "designation_name")
      .sort({ createdAt: -1 });
    res.json(allowances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get allowance by ID
// @route   GET /api/admin/allowances/:id
const getAllowanceById = async (req, res) => {
  try {
    const allowance = await AllowanceMaster.findById(req.params.id)
      .populate("designation_id", "designation_name");
    if (!allowance) {
      return res.status(404).json({ message: "Allowance not found" });
    }
    res.json(allowance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an allowance
// @route   PUT /api/admin/allowances/:id
const updateAllowance = async (req, res) => {
  try {
    const allowance = await AllowanceMaster.findById(req.params.id);
    if (!allowance) {
      return res.status(404).json({ message: "Allowance not found" });
    }

    allowance.designation_id = req.body.designation_id ?? allowance.designation_id;
    allowance.per_km = req.body.per_km ?? allowance.per_km;
    allowance.daily_allowance = req.body.daily_allowance ?? allowance.daily_allowance;
    allowance.out_of_town_food = req.body.out_of_town_food ?? allowance.out_of_town_food;
    allowance.ways_stay_allowance = req.body.ways_stay_allowance ?? allowance.ways_stay_allowance;
    allowance.other_expenses = req.body.other_expenses ?? allowance.other_expenses;
    allowance.status = req.body.status ?? allowance.status;

    const updated = await allowance.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an allowance
// @route   DELETE /api/admin/allowances/:id
const deleteAllowance = async (req, res) => {
  try {
    const allowance = await AllowanceMaster.findById(req.params.id);
    if (!allowance) {
      return res.status(404).json({ message: "Allowance not found" });
    }

    await allowance.deleteOne();
    res.json({ message: "Allowance deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAllowance,
  getAllowances,
  getAllowanceById,
  updateAllowance,
  deleteAllowance,
};
