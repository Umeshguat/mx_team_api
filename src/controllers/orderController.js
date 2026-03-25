const Order = require("../models/orderModel");
const InventoryProduct = require("../models/inventoryProductModel");
const InventoryTransaction = require("../models/inventoryTransactionModel");
const PaymentCredit = require("../models/paymentCreditModel");

// Helper: generate unique order number
const generateOrderNumber = async () => {
  const today = new Date();
  const prefix = `ORD-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const count = await Order.countDocuments({
    createdAt: { $gte: todayStart, $lte: todayEnd },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
};

// ==================== ORDER CRUD ====================

// @desc    Create a new order (with stock deduction)
// @route   POST /api/orders
const createOrder = async (req, res) => {
  try {
    const {
      vendor_name,
      vendor_mobile,
      vendor_address,
      items,
      discount,
      tax,
      payment_mode,
      note,
    } = req.body;

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ status: 400, message: "Order must have at least one item" });
    }

    // Validate stock availability for all items first
    const orderItems = [];
    for (const item of items) {
      const product = await InventoryProduct.findById(item.product_id);
      if (!product) {
        return res.status(404).json({
          status: 404,
          message: `Product not found: ${item.product_id}`,
        });
      }

      if (item.quantity > product.total_quantity) {
        return res.status(400).json({
          status: 400,
          message: `Insufficient stock for ${product.product_name}. Available: ${product.total_quantity}, Requested: ${item.quantity}`,
        });
      }

      // Auto-pick first active batch if not provided
      let batchId = item.batch_id || null;
      if (!batchId) {
        const activeBatch = product.batches
          .filter((b) => b.is_active && b.quantity > 0)
          .sort((a, b) => a.manufacturing_date - b.manufacturing_date)[0];
        if (activeBatch) batchId = activeBatch._id;
      }

      orderItems.push({
        product_id: product._id,
        batch_id: batchId,
        product_name: product.product_name,
        product_code: product.product_code,
        quantity: item.quantity,
        unit_price: item.unit_price || product.selling_price,
        total_price: item.quantity * (item.unit_price || product.selling_price),
      });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.total_price, 0);
    const grand_total = subtotal - (discount || 0) + (tax || 0);
    const order_number = await generateOrderNumber();

    const order = await Order.create({
      order_number,
      vendor_name,
      vendor_mobile,
      vendor_address: vendor_address || "",
      items: orderItems,
      subtotal,
      discount: discount || 0,
      tax: tax || 0,
      grand_total,
      payment_mode: payment_mode || "cash",
      note: note || "",
      created_by: req.user._id,
    });

    // Auto-create PaymentCredit if payment_mode is "credit"
    if (payment_mode === "credit") {
      const invoicePrefix = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}`;
      const invStart = new Date();
      invStart.setHours(0, 0, 0, 0);
      const invEnd = new Date();
      invEnd.setHours(23, 59, 59, 999);
      const invCount = await PaymentCredit.countDocuments({
        createdAt: { $gte: invStart, $lte: invEnd },
      });
      const invoice_number = `${invoicePrefix}-${String(invCount + 1).padStart(4, "0")}`;

      // Default due date: 30 days from now
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 30);

      await PaymentCredit.create({
        vendor_name,
        vendor_mobile: vendor_mobile || "",
        order_id: order._id,
        invoice_number,
        total_amount: grand_total,
        paid_amount: 0,
        payment_mode: "cash",
        due_date: req.body.due_date || defaultDueDate,
        note: `Auto-created credit for order ${order_number}`,
        created_by: req.user._id,
      });

      // Mark order payment status as unpaid (credit)
      order.payment_status = "unpaid";
      await order.save();
    }

    // Deduct stock using FIFO for each item
    for (const item of orderItems) {
      const product = await InventoryProduct.findById(item.product_id);

      const activeBatches = product.batches
        .filter((b) => b.is_active && b.quantity > 0)
        .sort((a, b) => a.manufacturing_date - b.manufacturing_date);

      let remainingQty = item.quantity;

      for (const batch of activeBatches) {
        if (remainingQty <= 0) break;
        const deductQty = Math.min(batch.quantity, remainingQty);
        batch.quantity -= deductQty;
        remainingQty -= deductQty;
        if (batch.quantity === 0) batch.is_active = false;
      }

      product.recalculateQuantity();
      await product.save();

      // Log stock-out transaction
      await InventoryTransaction.create({
        product_id: product._id,
        batch_id: item.batch_id,
        transaction_type: "stock_out",
        quantity: item.quantity,
        balance_after: product.total_quantity,
        reference: `Order: ${order_number}`,
        note: `Stock out for order ${order_number}`,
        created_by: req.user._id,
      });
    }

    res.status(201).json({
      status: 201,
      message: "Order created successfully",
      order,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
const getAllOrders = async (req, res) => {
  try {
    const {
      order_status,
      payment_status,
      from,
      to,
      search,
      created_by,
    } = req.query;

    const filter = {};

    if (order_status) filter.order_status = order_status;
    if (payment_status) filter.payment_status = payment_status;
    if (created_by) filter.created_by = created_by;
    if (search) {
      filter.$or = [
        { order_number: { $regex: search, $options: "i" } },
        { vendor_name: { $regex: search, $options: "i" } },
        { vendor_mobile: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      filter.order_date = {};
      if (from) filter.order_date.$gte = new Date(from);
      if (to) filter.order_date.$lte = new Date(to);
    }

    const orders = await Order.find(filter)
      .populate("created_by", "full_name email")
      .sort({ createdAt: -1 });

    res.json({ status: 200, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get my orders (logged-in user)
// @route   GET /api/orders/my-orders
const getMyOrders = async (req, res) => {
  try {
    const { order_status, payment_status, from, to } = req.query;
    const filter = { created_by: req.user._id };

    if (order_status) filter.order_status = order_status;
    if (payment_status) filter.payment_status = payment_status;
    if (from || to) {
      filter.order_date = {};
      if (from) filter.order_date.$gte = new Date(from);
      if (to) filter.order_date.$lte = new Date(to);
    }

    const orders = await Order.find(filter).sort({ createdAt: -1 });

    res.json({ status: 200, count: orders.length, orders });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("created_by", "full_name email")
      .populate("items.product_id", "product_name product_code brand category image");

    if (!order) {
      return res
        .status(404)
        .json({ status: 404, message: "Order not found" });
    }

    // Include linked payment credit info if exists
    const paymentCredit = await PaymentCredit.findOne({ order_id: order._id })
      .populate("payment_history.received_by", "full_name email")
      .select(
        "invoice_number total_amount paid_amount remaining_amount payment_status due_date payment_date payment_mode payment_history"
      );

    res.json({ status: 200, order, paymentCredit: paymentCredit || null });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const { order_status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ status: 404, message: "Order not found" });
    }

    if (order_status === "cancelled" && order.order_status !== "cancelled") {
      // Handle linked PaymentCredit on cancellation
      const linkedCredit = await PaymentCredit.findOne({ order_id: order._id });
      if (linkedCredit) {
        if (linkedCredit.paid_amount > 0) {
          return res.status(400).json({
            status: 400,
            message: `Cannot cancel order - payment credit has ₹${linkedCredit.paid_amount} already collected. Clear the credit first.`,
          });
        }
        // Delete unpaid credit
        await linkedCredit.deleteOne();
      }

      // Restore stock for cancelled order
      for (const item of order.items) {
        const product = await InventoryProduct.findById(item.product_id);
        if (product) {
          // Add stock back to the first active batch or create restore
          const batch = product.batches.id(item.batch_id);
          if (batch) {
            batch.quantity += item.quantity;
            batch.is_active = true;
          }
          product.recalculateQuantity();
          await product.save();

          // Log stock-in transaction for reversal
          await InventoryTransaction.create({
            product_id: product._id,
            batch_id: item.batch_id,
            transaction_type: "stock_in",
            quantity: item.quantity,
            balance_after: product.total_quantity,
            reference: `Order Cancelled: ${order.order_number}`,
            note: `Stock restored - order ${order.order_number} cancelled`,
            created_by: req.user._id,
          });
        }
      }
    }

    order.order_status = order_status;
    if (order_status === "delivered") {
      order.delivered_date = new Date();
    }

    await order.save();

    res.json({
      status: 200,
      message: `Order status updated to ${order_status}`,
      order,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment
const updatePaymentStatus = async (req, res) => {
  try {
    const { payment_status, payment_mode, paid_amount, transaction_reference, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ status: 404, message: "Order not found" });
    }

    if (payment_status) order.payment_status = payment_status;
    if (payment_mode) order.payment_mode = payment_mode;

    await order.save();

    // Sync with linked PaymentCredit if exists
    let paymentCredit = await PaymentCredit.findOne({ order_id: order._id });

    if (paymentCredit && paid_amount > 0) {
      // Record payment in credit
      paymentCredit.payment_history.push({
        amount: paid_amount,
        payment_mode: payment_mode || paymentCredit.payment_mode,
        transaction_reference: transaction_reference || "",
        payment_date: new Date(),
        note: note || "",
        received_by: req.user._id,
      });

      paymentCredit.paid_amount += paid_amount;
      paymentCredit.payment_mode = payment_mode || paymentCredit.payment_mode;
      paymentCredit.payment_date = new Date();

      // pre-save hook auto-calculates remaining_amount & payment_status
      await paymentCredit.save();

      // Re-sync order status from credit
      order.payment_status = paymentCredit.payment_status === "paid" ? "paid" : "partial";
      await order.save();
    }

    res.json({
      status: 200,
      message: "Payment status updated",
      order,
      paymentCredit: paymentCredit || null,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Delete order (only pending orders)
// @route   DELETE /api/orders/:id
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ status: 404, message: "Order not found" });
    }

    if (order.order_status !== "pending") {
      return res.status(400).json({
        status: 400,
        message: "Only pending orders can be deleted",
      });
    }

    // Handle linked PaymentCredit on deletion
    const linkedCredit = await PaymentCredit.findOne({ order_id: order._id });
    if (linkedCredit) {
      if (linkedCredit.paid_amount > 0) {
        return res.status(400).json({
          status: 400,
          message: `Cannot delete order - payment credit has ₹${linkedCredit.paid_amount} already collected. Clear the credit first.`,
        });
      }
      await linkedCredit.deleteOne();
    }

    // Restore stock before deleting
    for (const item of order.items) {
      const product = await InventoryProduct.findById(item.product_id);
      if (product) {
        const batch = product.batches.id(item.batch_id);
        if (batch) {
          batch.quantity += item.quantity;
          batch.is_active = true;
        }
        product.recalculateQuantity();
        await product.save();

        await InventoryTransaction.create({
          product_id: product._id,
          batch_id: item.batch_id,
          transaction_type: "stock_in",
          quantity: item.quantity,
          balance_after: product.total_quantity,
          reference: `Order Deleted: ${order.order_number}`,
          note: `Stock restored - order ${order.order_number} deleted`,
          created_by: req.user._id,
        });
      }
    }

    await order.deleteOne();

    res.json({ status: 200, message: "Order deleted and stock restored" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// ==================== SALES DASHBOARD ====================

// @desc    Get sales dashboard summary
// @route   GET /api/orders/dashboard/summary
const getSalesDashboard = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { today, tomorrow } = getTodayRange();

    // Date filter for custom range
    const dateFilter = {};
    if (from || to) {
      dateFilter.order_date = {};
      if (from) dateFilter.order_date.$gte = new Date(from);
      if (to) dateFilter.order_date.$lte = new Date(to);
    }

    // Today's stats
    const todayFilter = { order_date: { $gte: today, $lt: tomorrow } };

    const todayOrders = await Order.find(todayFilter);
    const todayOrderCount = todayOrders.length;
    const todayRevenue = todayOrders
      .filter((o) => o.order_status !== "cancelled")
      .reduce((sum, o) => sum + o.grand_total, 0);
    const todayPaidAmount = todayOrders
      .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
      .reduce((sum, o) => sum + o.grand_total, 0);

    // Overall stats
    const allOrders = await Order.find(dateFilter);
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders
      .filter((o) => o.order_status !== "cancelled")
      .reduce((sum, o) => sum + o.grand_total, 0);
    const totalPaid = allOrders
      .filter((o) => o.payment_status === "paid" && o.order_status !== "cancelled")
      .reduce((sum, o) => sum + o.grand_total, 0);
    const totalUnpaid = allOrders
      .filter((o) => o.payment_status === "unpaid" && o.order_status !== "cancelled")
      .reduce((sum, o) => sum + o.grand_total, 0);

    // Order status breakdown
    const statusBreakdown = {
      pending: allOrders.filter((o) => o.order_status === "pending").length,
      confirmed: allOrders.filter((o) => o.order_status === "confirmed").length,
      dispatched: allOrders.filter((o) => o.order_status === "dispatched").length,
      delivered: allOrders.filter((o) => o.order_status === "delivered").length,
      cancelled: allOrders.filter((o) => o.order_status === "cancelled").length,
    };

    // Payment status breakdown
    const paymentBreakdown = {
      paid: allOrders.filter((o) => o.payment_status === "paid").length,
      partial: allOrders.filter((o) => o.payment_status === "partial").length,
      unpaid: allOrders.filter((o) => o.payment_status === "unpaid").length,
    };

    // Top 5 selling products
    const productSales = {};
    allOrders
      .filter((o) => o.order_status !== "cancelled")
      .forEach((order) => {
        order.items.forEach((item) => {
          const key = item.product_code;
          if (!productSales[key]) {
            productSales[key] = {
              product_name: item.product_name,
              product_code: item.product_code,
              total_quantity: 0,
              total_revenue: 0,
            };
          }
          productSales[key].total_quantity += item.quantity;
          productSales[key].total_revenue += item.total_price;
        });
      });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5);

    // Top 5 vendors by order value
    const vendorSales = {};
    allOrders
      .filter((o) => o.order_status !== "cancelled")
      .forEach((order) => {
        const key = order.vendor_mobile;
        if (!vendorSales[key]) {
          vendorSales[key] = {
            vendor_name: order.vendor_name,
            vendor_mobile: order.vendor_mobile,
            total_orders: 0,
            total_value: 0,
          };
        }
        vendorSales[key].total_orders++;
        vendorSales[key].total_value += order.grand_total;
      });

    const topVendors = Object.values(vendorSales)
      .sort((a, b) => b.total_value - a.total_value)
      .slice(0, 5);

    // Recent 10 orders
    const recentOrders = await Order.find()
      .populate("created_by", "full_name email")
      .sort({ createdAt: -1 })
      .limit(10)
      .select("order_number vendor_name grand_total order_status payment_status order_date created_by");

    // Credit summary from PaymentCredit collection
    const allCredits = await PaymentCredit.find(dateFilter);
    const creditSummary = {
      total_credit_entries: allCredits.length,
      total_credit_amount: allCredits.reduce((sum, c) => sum + c.total_amount, 0),
      total_collected: allCredits.reduce((sum, c) => sum + c.paid_amount, 0),
      total_outstanding: allCredits.reduce((sum, c) => sum + c.remaining_amount, 0),
      overdue_count: allCredits.filter(
        (c) => c.due_date && c.due_date < new Date() && c.payment_status !== "paid"
      ).length,
    };

    res.json({
      status: 200,
      dashboard: {
        today: {
          orders: todayOrderCount,
          revenue: todayRevenue,
          paid: todayPaidAmount,
        },
        overall: {
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          total_paid: totalPaid,
          total_unpaid: totalUnpaid,
        },
        statusBreakdown,
        paymentBreakdown,
        creditSummary,
        topProducts,
        topVendors,
        recentOrders,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get sales report by salesman
// @route   GET /api/orders/dashboard/salesman-report
const getSalesmanReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.order_date = {};
      if (from) filter.order_date.$gte = new Date(from);
      if (to) filter.order_date.$lte = new Date(to);
    }

    const orders = await Order.find(filter).populate(
      "created_by",
      "full_name email headquarter_name"
    );

    const salesmanData = {};
    orders
      .filter((o) => o.order_status !== "cancelled")
      .forEach((order) => {
        const key = order.created_by?._id?.toString();
        if (!key) return;

        if (!salesmanData[key]) {
          salesmanData[key] = {
            _id: order.created_by._id,
            full_name: order.created_by.full_name,
            email: order.created_by.email,
            headquarter_name: order.created_by.headquarter_name,
            total_orders: 0,
            total_revenue: 0,
            paid_amount: 0,
            unpaid_amount: 0,
            credit_outstanding: 0,
          };
        }

        salesmanData[key].total_orders++;
        salesmanData[key].total_revenue += order.grand_total;
        if (order.payment_status === "paid") {
          salesmanData[key].paid_amount += order.grand_total;
        } else if (order.payment_status === "unpaid") {
          salesmanData[key].unpaid_amount += order.grand_total;
        }
      });

    // Enrich with credit data per salesman
    const creditFilter = {};
    if (from || to) {
      creditFilter.createdAt = {};
      if (from) creditFilter.createdAt.$gte = new Date(from);
      if (to) creditFilter.createdAt.$lte = new Date(to);
    }
    const credits = await PaymentCredit.find(creditFilter);
    credits.forEach((credit) => {
      const key = credit.created_by?.toString();
      if (key && salesmanData[key]) {
        salesmanData[key].credit_outstanding += credit.remaining_amount;
      }
    });

    const report = Object.values(salesmanData).sort(
      (a, b) => b.total_revenue - a.total_revenue
    );

    res.json({ status: 200, count: report.length, report });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// Helper: get today's date range
const getTodayRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
};

module.exports = {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  updatePaymentStatus,
  deleteOrder,
  getSalesDashboard,
  getSalesmanReport,
};
