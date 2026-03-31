const InventoryProduct = require("../models/inventoryProductModel");
const InventoryTransaction = require("../models/inventoryTransactionModel");

// ==================== PRODUCT CRUD ====================

// @desc    Create a new inventory product
// @route   POST /api/inventory/products
const createProduct = async (req, res) => {
  try {
    const {
      product_name,
      product_code,
      brand,
      category,
      description,
      unit,
      selling_price,
      reorder_level,
      shelf_life_days,
      image,
    } = req.body;

    console.log("Creating product with data:", req.body);

    const existingProduct = await InventoryProduct.findOne({ product_code });
    if (existingProduct) {
      return res
        .status(400)
        .json({ status: 400, message: "Product code already exists" });
    }

    const product = await InventoryProduct.create({
      product_name,
      product_code,
      brand,
      category,
      description: description || "",
      unit,
      selling_price,
      reorder_level,
      shelf_life_days,
      image: image || null,
    });

    res.status(201).json({
      status: 201,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get all inventory products
// @route   GET /api/inventory/products
const getAllProducts = async (req, res) => {
  try {
    const { brand, category, is_active, search } = req.query;
    const filter = {};

    if (brand) filter.brand = brand;
    if (category) filter.category = category;
    if (is_active !== undefined) filter.is_active = is_active === "true";
    if (search) {
      filter.$or = [
        { product_name: { $regex: search, $options: "i" } },
        { product_code: { $regex: search, $options: "i" } },
      ];
    }

    const products = await InventoryProduct.find(filter)
    .populate("brand", "brand_name")
    .populate("category", "category_name")
    .sort({ product_name: 1 });

    res.json({ status: 200, count: products.length, products });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get product by ID
// @route   GET /api/inventory/products/:id
const getProductById = async (req, res) => {
  try {
    const product = await InventoryProduct.findById(req.params.id)
      .populate("brand", "brand_name")
      .populate("category", "category_name");
    if (!product) {
      return res
        .status(404)
        .json({ status: 404, message: "Product not found" });
    }

    const expiryStatus = product.getBatchExpiryStatus();

    res.json({ status: 200, product, expiryStatus });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/inventory/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await InventoryProduct.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ status: 404, message: "Product not found" });
    }

    const allowedFields = [
      "product_name",
      "brand",
      "category",
      "description",
      "unit",
      "selling_price",
      "reorder_level",
      "shelf_life_days",
      "image",
      "is_active",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    const updatedProduct = await product.save();

    res.json({
      status: 200,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/inventory/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await InventoryProduct.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ status: 404, message: "Product not found" });
    }

    await product.deleteOne();

    res.json({ status: 200, message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// ==================== BATCH MANAGEMENT ====================

// @desc    Add batch to product (Stock-In)
// @route   POST /api/inventory/products/:id/batches
const addBatch = async (req, res) => {
  try {
    const product = await InventoryProduct.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ status: 404, message: "Product not found" });
    }

    const {
      batch_number,
      manufacturing_date,
      expiry_date,
      quantity,
      purchase_price,
      reference,
      note,
    } = req.body;

    // Check for duplicate batch number in this product
    const existingBatch = product.batches.find(
      (b) => b.batch_number === batch_number
    );
    if (existingBatch) {
      return res.status(400).json({
        status: 400,
        message: "Batch number already exists for this product",
      });
    }

    product.batches.push({
      batch_number,
      manufacturing_date,
      expiry_date,
      quantity,
      purchase_price,
    });

    product.recalculateQuantity();
    await product.save();

    // Get the newly added batch
    const newBatch = product.batches[product.batches.length - 1];

    // Log transaction
    await InventoryTransaction.create({
      product_id: product._id,
      batch_id: newBatch._id,
      transaction_type: "stock_in",
      quantity,
      balance_after: product.total_quantity,
      reference: reference || "",
      note: note || `New batch ${batch_number} added`,
      created_by: req.user._id,
    });

    res.status(201).json({
      status: 201,
      message: "Batch added and stock updated successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Stock-Out from product (FIFO enforced)
// @route   POST /api/inventory/products/:id/stock-out
const stockOut = async (req, res) => {
  try {
    const product = await InventoryProduct.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ status: 404, message: "Product not found" });
    }

    const { quantity, reference, note } = req.body;

    if (!quantity || quantity <= 0) {
      return res
        .status(400)
        .json({ status: 400, message: "Valid quantity is required" });
    }

    if (quantity > product.total_quantity) {
      return res.status(400).json({
        status: 400,
        message: `Insufficient stock. Available: ${product.total_quantity}`,
      });
    }

    // FIFO: Sort active batches by manufacturing_date (oldest first)
    const activeBatches = product.batches
      .filter((b) => b.is_active && b.quantity > 0)
      .sort((a, b) => a.manufacturing_date - b.manufacturing_date);

    let remainingQty = quantity;
    const affectedBatches = [];

    for (const batch of activeBatches) {
      if (remainingQty <= 0) break;

      const deductQty = Math.min(batch.quantity, remainingQty);
      batch.quantity -= deductQty;
      remainingQty -= deductQty;

      if (batch.quantity === 0) {
        batch.is_active = false;
      }

      affectedBatches.push({
        batch_id: batch._id,
        batch_number: batch.batch_number,
        deducted: deductQty,
      });
    }

    product.recalculateQuantity();
    await product.save();

    // Log transaction
    await InventoryTransaction.create({
      product_id: product._id,
      batch_id: affectedBatches[0].batch_id,
      transaction_type: "stock_out",
      quantity,
      balance_after: product.total_quantity,
      reference: reference || "",
      note: note || `FIFO stock-out of ${quantity} units`,
      created_by: req.user._id,
    });

    // Check low stock alert
    const lowStockAlert = product.isLowStock();

    res.json({
      status: 200,
      message: "Stock-out processed successfully (FIFO)",
      product,
      affectedBatches,
      lowStockAlert: lowStockAlert
        ? `WARNING: Stock is at or below reorder level (${product.reorder_level})`
        : null,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Stock adjustment (physical audit reconciliation)
// @route   POST /api/inventory/products/:id/adjust
const adjustStock = async (req, res) => {
  try {
    const product = await InventoryProduct.findById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ status: 404, message: "Product not found" });
    }

    const { batch_id, actual_quantity, note } = req.body;

    if (!batch_id || actual_quantity === undefined) {
      return res.status(400).json({
        status: 400,
        message: "batch_id and actual_quantity are required",
      });
    }

    const batch = product.batches.id(batch_id);
    if (!batch) {
      return res
        .status(404)
        .json({ status: 404, message: "Batch not found" });
    }

    const systemQuantity = batch.quantity;
    const discrepancy = actual_quantity - systemQuantity;

    batch.quantity = actual_quantity;
    if (actual_quantity === 0) batch.is_active = false;

    product.recalculateQuantity();
    await product.save();

    // Log adjustment transaction
    await InventoryTransaction.create({
      product_id: product._id,
      batch_id: batch._id,
      transaction_type: "adjustment",
      quantity: Math.abs(discrepancy),
      balance_after: product.total_quantity,
      note:
        note ||
        `Stock adjustment: system=${systemQuantity}, actual=${actual_quantity}, discrepancy=${discrepancy}`,
      created_by: req.user._id,
    });

    res.json({
      status: 200,
      message: "Stock adjusted successfully",
      product,
      adjustment: {
        batch_number: batch.batch_number,
        system_quantity: systemQuantity,
        actual_quantity,
        discrepancy,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// ==================== ALERTS & REPORTS ====================

// @desc    Get low stock alerts
// @route   GET /api/inventory/alerts/low-stock
const getLowStockAlerts = async (req, res) => {
  try {
    const products = await InventoryProduct.find({ is_active: true })
      .populate("brand", "brand_name")
      .populate("category", "category_name");

    const lowStockProducts = products
      .filter((p) => p.isLowStock())
      .map((p) => ({
        _id: p._id,
        product_name: p.product_name,
        product_code: p.product_code,
        brand: p.brand,
        category: p.category,
        total_quantity: p.total_quantity,
        reorder_level: p.reorder_level,
        deficit: p.reorder_level - p.total_quantity,
      }));

    res.json({
      status: 200,
      count: lowStockProducts.length,
      lowStockProducts,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get near-expiry alerts (batches expiring within 30 days)
// @route   GET /api/inventory/alerts/near-expiry
const getNearExpiryAlerts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const products = await InventoryProduct.find({ is_active: true })
      .populate("brand", "brand_name")
      .populate("category", "category_name");

    const alerts = [];

    products.forEach((product) => {
      const batchStatuses = product.getBatchExpiryStatus();
      const nearExpiry = batchStatuses.filter(
        (b) => b.days_to_expiry <= days && b.quantity > 0
      );

      if (nearExpiry.length > 0) {
        alerts.push({
          _id: product._id,
          product_name: product.product_name,
          product_code: product.product_code,
          brand: product.brand,
          batches: nearExpiry,
        });
      }
    });

    res.json({ status: 200, count: alerts.length, alerts });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get stock aging report (slow-moving inventory)
// @route   GET /api/inventory/reports/stock-aging
const getStockAgingReport = async (req, res) => {
  try {
    const products = await InventoryProduct.find({ is_active: true })
      .populate("brand", "brand_name")
      .populate("category", "category_name");

    const report = products.map((product) => {
      const batchStatuses = product.getBatchExpiryStatus();

      const green = batchStatuses.filter((b) => b.status === "green");
      const yellow = batchStatuses.filter((b) => b.status === "yellow");
      const red = batchStatuses.filter((b) => b.status === "red");
      const expired = batchStatuses.filter((b) => b.status === "expired");

      return {
        _id: product._id,
        product_name: product.product_name,
        product_code: product.product_code,
        brand: product.brand,
        category: product.category,
        total_quantity: product.total_quantity,
        shelf_life_days: product.shelf_life_days,
        aging: {
          green: {
            count: green.length,
            total_qty: green.reduce((s, b) => s + b.quantity, 0),
          },
          yellow: {
            count: yellow.length,
            total_qty: yellow.reduce((s, b) => s + b.quantity, 0),
          },
          red: {
            count: red.length,
            total_qty: red.reduce((s, b) => s + b.quantity, 0),
          },
          expired: {
            count: expired.length,
            total_qty: expired.reduce((s, b) => s + b.quantity, 0),
          },
        },
      };
    });

    res.json({ status: 200, report });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get inventory dashboard summary
// @route   GET /api/inventory/dashboard
const getInventoryDashboard = async (req, res) => {
  try {
    const products = await InventoryProduct.find({ is_active: true })
      .populate("brand", "brand_name")
      .populate("category", "category_name");

    const totalProducts = products.length;
    const totalSKUs = products.length;
    let totalStockValue = 0;
    let lowStockCount = 0;
    let nearExpiryCount = 0;
    let expiredCount = 0;

    const brandWise = {};

    products.forEach((product) => {
      // Stock value
      totalStockValue += product.total_quantity * product.selling_price;

      // Low stock
      if (product.isLowStock()) lowStockCount++;

      // Expiry tracking
      const batchStatuses = product.getBatchExpiryStatus();
      batchStatuses.forEach((b) => {
        if (b.status === "expired") expiredCount++;
        else if (b.status === "red" || b.status === "yellow")
          nearExpiryCount++;
      });

      // Brand-wise summary
      const brandName = product.brand ? product.brand.brand_name : "Unknown";
      if (!brandWise[brandName]) {
        brandWise[brandName] = { products: 0, total_quantity: 0, value: 0 };
      }
      brandWise[brandName].products++;
      brandWise[brandName].total_quantity += product.total_quantity;
      brandWise[brandName].value +=
        product.total_quantity * product.selling_price;
    });

    res.json({
      status: 200,
      dashboard: {
        totalProducts,
        totalSKUs,
        totalStockValue,
        lowStockCount,
        nearExpiryCount,
        expiredCount,
        brandWise,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get transaction history for a product
// @route   GET /api/inventory/products/:id/transactions
const getProductTransactions = async (req, res) => {
  try {
    const { type, from, to } = req.query;
    const filter = { product_id: req.params.id };

    if (type) filter.transaction_type = type;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const transactions = await InventoryTransaction.find(filter)
      .populate("created_by", "full_name email")
      .sort({ createdAt: -1 });

    res.json({ status: 200, count: transactions.length, transactions });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  addBatch,
  stockOut,
  adjustStock,
  getLowStockAlerts,
  getNearExpiryAlerts,
  getStockAgingReport,
  getInventoryDashboard,
  getProductTransactions,
};
