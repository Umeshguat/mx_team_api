const CategoryMaster = require("../models/categoryMasterModel");

// @desc    Create a new category
// @route   POST /api/admin/categories
const createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;

    const exists = await CategoryMaster.findOne({ category_name });
    if (exists) {
      return res.status(400).json({ message: "Category already exists" });
    }

    const category = await CategoryMaster.create({ category_name });
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all categories
// @route   GET /api/admin/categories
const getCategories = async (req, res) => {
  try {
    const categories = await CategoryMaster.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: 200,
      message: "Categories retrieved successfully",
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
};

// @desc    Get category by ID
// @route   GET /api/admin/categories/:id
const getCategoryById = async (req, res) => {
  try {
    const category = await CategoryMaster.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        status: 404,
        message: "Category not found",
      });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a category
// @route   PUT /api/admin/categories/:id
const updateCategory = async (req, res) => {
  try {
    const category = await CategoryMaster.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    category.category_name = req.body.category_name ?? category.category_name;
    category.status = req.body.status ?? category.status;

    const updated = await category.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a category
// @route   DELETE /api/admin/categories/:id
const deleteCategory = async (req, res) => {
  try {
    const category = await CategoryMaster.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    await category.deleteOne();
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
};
