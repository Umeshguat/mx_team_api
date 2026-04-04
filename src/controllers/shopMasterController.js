const ShopMaster = require("../models/shopMasterModel");

// @desc    Create a new shop
// @route   POST /api/admin/shops
const createShop = async (req, res) => {
  try {
    const { distributor_id, shop_name, shop_mobile, shop_address, state, city, latitude, longitude } = req.body;
    const shop = await ShopMaster.create({
      distributor_id,
      shop_name,
      shop_mobile,
      shop_address,
      state,
      city,
      latitude,
      longitude,
    });
    res.status(201).json({
      status: 200,
      message: "Shop created successfully",
      data: shop,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get all shops with pagination
// @route   GET /api/admin/shops/list
const getShops = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    const pageNum = Math.max(parseInt(page), 1);
    const limitNum = Math.max(parseInt(limit), 1);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};
    if (search) {
      filter.$or = [
        { shop_name: { $regex: search, $options: "i" } },
        { shop_mobile: { $regex: search, $options: "i" } },
      ];
    }

    const [shops, total] = await Promise.all([
      ShopMaster.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      ShopMaster.countDocuments(filter),
    ]);

    res.status(200).json({
      status: 200,
      message: "Shops retrieved successfully",
      data: shops,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get shop by ID
// @route   GET /api/admin/shops/:id
const getShopById = async (req, res) => {
  try {
    const shop = await ShopMaster.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ status: 404, message: "Shop not found" });
    }
    res.status(200).json({
      status: 200,
      message: "Shop retrieved successfully",
      data: shop,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Update a shop
// @route   PUT /api/admin/shops/:id
const updateShop = async (req, res) => {
  try {
    const shop = await ShopMaster.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ status: 404, message: "Shop not found" });
    }

    shop.distributor_id = req.body.distributor_id ?? shop.distributor_id;
    shop.shop_name = req.body.shop_name ?? shop.shop_name;
    shop.shop_mobile = req.body.shop_mobile ?? shop.shop_mobile;
    shop.shop_address = req.body.shop_address ?? shop.shop_address;
    shop.state = req.body.state ?? shop.state;
    shop.city = req.body.city ?? shop.city;
    shop.latitude = req.body.latitude ?? shop.latitude;
    shop.longitude = req.body.longitude ?? shop.longitude;

    const updatedShop = await shop.save();
    res.status(200).json({
      status: 200,
      message: "Shop updated successfully",
      data: updatedShop,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Delete a shop
// @route   DELETE /api/admin/shops/:id
const deleteShop = async (req, res) => {
  try {
    const shop = await ShopMaster.findById(req.params.id);
    if (!shop) {
      return res.status(404).json({ status: 404, message: "Shop not found" });
    }

    await shop.deleteOne();
    res.status(200).json({
      status: 200,
      message: "Shop deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Search shop by name or mobile number (returns one)
// @route   GET /api/admin/shops/search?search=keyword
const searchShop = async (req, res) => {
  try {
    const { keyword } = req.query;

    if (!keyword) {
      return res.status(400).json({
        status: 400,
        message: "Please provide search keyword",
      });
    }

    const shop = await ShopMaster.findOne({
      $or: [
        { shop_name: { $regex: keyword, $options: "i" } },
        { shop_mobile: { $regex: keyword, $options: "i" } },
      ],
    });

    if (!shop) {
      return res.status(404).json({ status: 404, message: "Shop not found" });
    }

    res.status(200).json({
      status: 200,
      message: "Shop retrieved successfully",
      data: shop,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = { createShop, getShops, getShopById, updateShop, deleteShop, searchShop };
