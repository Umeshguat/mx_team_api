const BrandMaster = require("../models/brandMasterModel");

// @desc    Create a new brand
// @route   POST /api/admin/brands
const createBrand = async (req, res) => {
  try {
    const { brand_name } = req.body;

    const exists = await BrandMaster.findOne({ brand_name });
    if (exists) {
      return res.status(400).json({ message: "Brand already exists" });
    }

    const brand = await BrandMaster.create({ brand_name });
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all brands
// @route   GET /api/admin/brands
const getBrands = async (req, res) => {
  try {
    const brands = await BrandMaster.find().sort({ createdAt: -1 });
    res.status(200).json({
      status: 200,
      message: "Brands retrieved successfully",
      data: brands,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: error.message,
    });
  }
};

// @desc    Get brand by ID
// @route   GET /api/admin/brands/:id
const getBrandById = async (req, res) => {
  try {
    const brand = await BrandMaster.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({
        status: 404,
        message: "Brand not found",
      });
    }
    res.json(brand);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a brand
// @route   PUT /api/admin/brands/:id
const updateBrand = async (req, res) => {
  try {
    const brand = await BrandMaster.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    brand.brand_name = req.body.brand_name ?? brand.brand_name;
    brand.status = req.body.status ?? brand.status;

    const updated = await brand.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a brand
// @route   DELETE /api/admin/brands/:id
const deleteBrand = async (req, res) => {
  try {
    const brand = await BrandMaster.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: "Brand not found" });
    }

    await brand.deleteOne();
    res.json({ message: "Brand deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
};
