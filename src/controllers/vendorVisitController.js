const VendorVisit = require("../models/vendorVisitModel");
const { uploadFilesToS3 } = require("../utils/s3Upload");

const S3_FOLDER = "vendor-visits";

// @desc    Add vendor visit
// @route   POST /api/vendor-visits
const addVendorVisit = async (req, res) => {
  console.log("addVendorVisit req.body:", req.body);
  console.log("addVendorVisit req.files:", req.files);
  try {
    const files = req.files || {};

    if (!files.selfie_with_vendor) {
      return res.status(400).json({
        status:400,
        message: "Selfie with vendor is required",
      });
    }

    const {
      vendor_name,
      vendor_mobile,
      address_gps,
      latitude,
      longitude,
      on_board,
      visit_date,
      note,
    } = req.body;

    // Upload selfie to S3
    const s3Urls = await uploadFilesToS3(files, S3_FOLDER);

    const vendorVisit = await VendorVisit.create({
      user_id: req.user._id,
      vendor_name,
      vendor_mobile,
      selfie_with_vendor: s3Urls.selfie_with_vendor,
      address_gps,
      latitude,
      longitude,
      on_board: on_board || false,
      visit_date: visit_date || Date.now(),
      note: note || "",
    });

    res.status(201).json({
      status:201,
      message: "Vendor visit added successfully",
      vendorVisit,
    });
  } catch (error) {
    res.status(500).json({    status:500, message: error.message });
  }
};

// @desc    Update vendor visit
// @route   POST /api/vendor-visits/update
const updateVendorVisit = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ status: 400, message: "Vendor visit ID is required" });
    }

    const vendorVisit = await VendorVisit.findOne({
      _id: id,
      user_id: req.user._id,
    });

    if (!vendorVisit) {
      return res.status(404).json({ status: 404, message: "Vendor visit not found" });
    }

    const files = req.files || {};

    vendorVisit.vendor_name = req.body.vendor_name || vendorVisit.vendor_name;
    vendorVisit.vendor_mobile = req.body.vendor_mobile || vendorVisit.vendor_mobile;
    vendorVisit.address_gps = req.body.address_gps || vendorVisit.address_gps;
    vendorVisit.latitude = req.body.latitude || vendorVisit.latitude;
    vendorVisit.longitude = req.body.longitude || vendorVisit.longitude;
    if (req.body.on_board !== undefined) vendorVisit.on_board = req.body.on_board;
    if (req.body.visit_date) vendorVisit.visit_date = req.body.visit_date;
    if (req.body.note !== undefined) vendorVisit.note = req.body.note;
    if (files.selfie_with_vendor) {
      const s3Urls = await uploadFilesToS3(files, S3_FOLDER);
      vendorVisit.selfie_with_vendor = s3Urls.selfie_with_vendor;
    }

    const updatedVisit = await vendorVisit.save();

    res.json({
      status: 200,
      message: "Vendor visit updated successfully",
      vendorVisit: updatedVisit,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Delete vendor visit
// @route   DELETE /api/vendor-visits/:id
const deleteVendorVisit = async (req, res) => {
  try {
    const vendorVisit = await VendorVisit.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    });

    if (!vendorVisit) {
      return res.status(404).json({ status: 404, message: "Vendor visit not found" });
    }

    await vendorVisit.deleteOne();

    res.json({ status: 200, message: "Vendor visit deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get vendor visit by ID
// @route   GET /api/vendor-visits/:id
const getVendorVisitById = async (req, res) => {
  try {
    const vendorVisit = await VendorVisit.findOne({
      _id: req.params.id,
      user_id: req.user._id,
    }).populate("user_id", "full_name email");

    if (!vendorVisit) {
      return res.status(404).json({ status: 404, message: "Vendor visit not found" });
    }

    res.json({ status: 200, vendorVisit });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get all vendor visits for logged-in user
// @route   GET /api/vendor-visits
const getAllVendorVisits = async (req, res) => {
  try {
    const vendorVisits = await VendorVisit.find({
      user_id: req.user._id,
    }).sort({ visit_date: -1 });

    res.json({ status: 200, vendorVisits });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get vendor visits by user ID
// @route   GET /api/vendor-visits/user/:userId
const getVendorVisitsByUserId = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const vendorVisits = await VendorVisit.find({
      user_id: req.params.userId,
      visit_date: { $gte: startOfDay, $lte: endOfDay },
    })
      .populate("user_id", "full_name email")
      .sort({ visit_date: -1 });

    res.json({ status: 200, vendorVisits });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = {
  addVendorVisit,
  updateVendorVisit,
  deleteVendorVisit,
  getVendorVisitById,
  getAllVendorVisits,
  getVendorVisitsByUserId,
};
