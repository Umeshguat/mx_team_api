const shopMasterModel = require("../models/shopMasterModel");

// Create a new shop
exports.createShop = async (req, res) => {
    try {
        const { distributor_id, shop_name, shop_mobile, shop_address, state, city, latitude, longitude } = req.body;
        const shop = await shopMasterModel.create({
            distributor_id,
            shop_name,
            shop_mobile,
            shop_address,
            state,
            city,
            latitude,
            longitude
        });
        res.status(201).json({
            status: 200,
            message: "Shop created successfully",
            data: shop
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
}

exports.getShops = async (req, res) => {
    try {
        const shops = await shopMasterModel.findAll();
        res.status(200).json({
            status: 200,
            message: "Shops retrieved successfully",
            data: shops
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
}

exports.getShopById = async (req, res) => {
    try {
        const shop = await shopMasterModel.findByPk(req.params.id);
        if (!shop) {
            return res.status(404).json({ status: 404, message: "Shop not found" });
        }
        res.status(200).json({
            status: 200,
            message: "Shop retrieved successfully",
            data: shop
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
}

exports.updateshop = async (req, res) => {
    try {
        const shop = await shopMasterModel.findByPk(req.params.id);
        if (!shop) {
            return res.status(404).json({ status: 404, message: "Shop not found" });
        }
        const { distributor_id, shop_name, shop_mobile, shop_address, state, city, latitude, longitude } = req.body;
        await shop.update({
            distributor_id,
            shop_name,
            shop_mobile,
            shop_address,
            state,
            city
        });
        res.status(200).json({
            status: 200,
            message: "Shop updated successfully",
            data: shop
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
}

module.exports = {
    createShop,
    getShops,
    getShopById,
    updateshop
};