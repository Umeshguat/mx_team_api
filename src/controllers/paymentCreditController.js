  const PaymentCredit = require("../models/paymentCreditModel");
const Order = require("../models/orderModel");

// Helper: get today's date range
const getTodayRange = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return { today, tomorrow };
};

// Helper: generate unique invoice number
const generateInvoiceNumber = async () => {
  const today = new Date();
  const prefix = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
  const todayStart = new Date(today.setHours(0, 0, 0, 0));
  const todayEnd = new Date(today.setHours(23, 59, 59, 999));

  const count = await PaymentCredit.countDocuments({
    createdAt: { $gte: todayStart, $lte: todayEnd },
  });

  return `${prefix}-${String(count + 1).padStart(4, "0")}`;
};

// ==================== PAYMENT CREDIT CRUD ====================

// @desc    Create a new payment credit entry
// @route   POST /api/payment-credits
const createPaymentCredit = async (req, res) => {
  try {
    const {
      vendor_name,
      vendor_mobile,
      order_id,
      batch_id,
      total_amount,
      paid_amount,
      payment_mode,
      transaction_reference,
      due_date,
      payment_date,
      note,
    } = req.body;

    if (!vendor_name || !order_id || !total_amount) {
      return res.status(400).json({
        status: 400,
        message: "Vendor name, order ID, and total amount are required",
      });
    }

    // Validate order exists
    const order = await Order.findById(order_id);
    if (!order) {
      return res.status(404).json({
        status: 404,
        message: "Order not found",
      });
    }

    // Check if payment credit already exists for this order
    const existingCredit = await PaymentCredit.findOne({ order_id });
    if (existingCredit) {
      return res.status(400).json({
        status: 400,
        message: "Payment credit already exists for this order",
      });
    }

    const invoice_number = await generateInvoiceNumber();

    const paymentCredit = await PaymentCredit.create({
      vendor_name,
      vendor_mobile: vendor_mobile || order.vendor_mobile || "",
      order_id,
      invoice_number,
      batch_id: batch_id || null,
      total_amount,
      paid_amount: paid_amount || 0,
      payment_mode: payment_mode || "cash",
      transaction_reference: transaction_reference || "",
      due_date: due_date || null,
      payment_date: paid_amount > 0 ? payment_date || new Date() : null,
      note: note || "",
      created_by: req.user._id,
      payment_history:
        paid_amount > 0
          ? [
              {
                amount: paid_amount,
                payment_mode: payment_mode || "cash",
                transaction_reference: transaction_reference || "",
                payment_date: payment_date || new Date(),
                note: note || "",
                received_by: req.user._id,
              },
            ]
          : [],
    });

    // Update order payment status
    if (paid_amount >= total_amount) {
      order.payment_status = "paid";
    } else if (paid_amount > 0) {
      order.payment_status = "partial";
    } else {
      order.payment_status = "unpaid";
    }
    order.payment_mode = payment_mode || order.payment_mode;
    await order.save();

    res.status(201).json({
      status: 201,
      message: "Payment credit created successfully",
      paymentCredit,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get all payment credits
// @route   GET /api/payment-credits
const getAllPaymentCredits = async (req, res) => {
  try {
    const { payment_status, search, from, to, created_by, vendor_name, order_id } =
      req.query;

    const filter = {};

    if (order_id) filter.order_id = order_id;
    if (payment_status) filter.payment_status = payment_status;
    if (created_by) filter.created_by = created_by;
    if (vendor_name) filter.vendor_name = { $regex: vendor_name, $options: "i" };
    if (search) {
      filter.$or = [
        { vendor_name: { $regex: search, $options: "i" } },
        { vendor_mobile: { $regex: search, $options: "i" } },
        { invoice_number: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const paymentCredits = await PaymentCredit.find(filter)
      .populate("order_id", "order_number vendor_name grand_total order_status")
      .populate("created_by", "full_name email")
      .sort({ createdAt: -1 });

    res.json({ status: 200, count: paymentCredits.length, paymentCredits });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get my payment credits (logged-in salesman)
// @route   GET /api/payment-credits/my-credits
const getMyPaymentCredits = async (req, res) => {
  try {
    const { payment_status, from, to } = req.query;
    const filter = { created_by: req.user._id };

    if (payment_status) filter.payment_status = payment_status;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const paymentCredits = await PaymentCredit.find(filter)
      .populate("order_id", "order_number vendor_name grand_total order_status")
      .sort({ createdAt: -1 });

    res.json({ status: 200, count: paymentCredits.length, paymentCredits });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get payment credit by ID
// @route   GET /api/payment-credits/:id
const getPaymentCreditById = async (req, res) => {
  try {
    const paymentCredit = await PaymentCredit.findById(req.params.id)
      .populate("order_id")
      .populate("created_by", "full_name email")
      .populate("payment_history.received_by", "full_name email");

    if (!paymentCredit) {
      return res
        .status(404)
        .json({ status: 404, message: "Payment credit not found" });
    }

    res.json({ status: 200, paymentCredit });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Update payment credit details
// @route   PUT /api/payment-credits/:id
const updatePaymentCredit = async (req, res) => {
  try {
    const { due_date, note, vendor_mobile } = req.body;

    const paymentCredit = await PaymentCredit.findById(req.params.id);
    if (!paymentCredit) {
      return res
        .status(404)
        .json({ status: 404, message: "Payment credit not found" });
    }

    if (paymentCredit.payment_status === "paid") {
      return res.status(400).json({
        status: 400,
        message: "Cannot update a fully paid credit",
      });
    }

    if (due_date !== undefined) paymentCredit.due_date = due_date;
    if (note !== undefined) paymentCredit.note = note;
    if (vendor_mobile !== undefined) paymentCredit.vendor_mobile = vendor_mobile;

    await paymentCredit.save();

    res.json({
      status: 200,
      message: "Payment credit updated successfully",
      paymentCredit,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Record a payment (partial or full)
// @route   POST /api/payment-credits/:id/pay
const recordPayment = async (req, res) => {
  try {
    const { amount, payment_mode, transaction_reference, note } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 400,
        message: "Payment amount must be greater than 0",
      });
    }

    if (!payment_mode) {
      return res.status(400).json({
        status: 400,
        message: "Payment mode is required",
      });
    }

    const paymentCredit = await PaymentCredit.findById(req.params.id);
    if (!paymentCredit) {
      return res
        .status(404)
        .json({ status: 404, message: "Payment credit not found" });
    }

    if (paymentCredit.payment_status === "paid") {
      return res.status(400).json({
        status: 400,
        message: "This credit is already fully paid",
      });
    }

    if (amount > paymentCredit.remaining_amount) {
      return res.status(400).json({
        status: 400,
        message: `Payment amount exceeds remaining balance of ${paymentCredit.remaining_amount}`,
      });
    }

    // Add to payment history
    paymentCredit.payment_history.push({
      amount,
      payment_mode,
      transaction_reference: transaction_reference || "",
      payment_date: new Date(),
      note: note || "",
      received_by: req.user._id,
    });

    // Update amounts
    paymentCredit.paid_amount += amount;
    paymentCredit.payment_mode = payment_mode;
    paymentCredit.transaction_reference = transaction_reference || paymentCredit.transaction_reference;
    paymentCredit.payment_date = new Date();

    // pre-save hook will auto-calculate remaining_amount and payment_status
    await paymentCredit.save();

    // Sync order payment status
    const order = await Order.findById(paymentCredit.order_id);
    if (order) {
      if (paymentCredit.payment_status === "paid") {
        order.payment_status = "paid";
      } else {
        order.payment_status = "partial";
      }
      await order.save();
    }

    res.json({
      status: 200,
      message: `Payment of ₹${amount} recorded successfully`,
      paymentCredit,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Delete payment credit (only pending with no payments)
// @route   DELETE /api/payment-credits/:id
const deletePaymentCredit = async (req, res) => {
  try {
    const paymentCredit = await PaymentCredit.findById(req.params.id);

    if (!paymentCredit) {
      return res
        .status(404)
        .json({ status: 404, message: "Payment credit not found" });
    }

    if (paymentCredit.paid_amount > 0) {
      return res.status(400).json({
        status: 400,
        message: "Cannot delete a credit with recorded payments",
      });
    }

    await paymentCredit.deleteOne();

    res.json({ status: 200, message: "Payment credit deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get overdue payment credits
// @route   GET /api/payment-credits/overdue
const getOverdueCredits = async (req, res) => {
  try {
    const now = new Date();

    const overdueCredits = await PaymentCredit.find({
      due_date: { $lt: now },
      payment_status: { $in: ["pending", "partial"] },
    })
      .populate("order_id", "order_number vendor_name grand_total")
      .populate("created_by", "full_name email")
      .sort({ due_date: 1 });

    // Update status to overdue
    for (const credit of overdueCredits) {
      if (credit.payment_status !== "overdue") {
        credit.payment_status = "overdue";
        await credit.save();
      }
    }

    const totalOverdueAmount = overdueCredits.reduce(
      (sum, c) => sum + c.remaining_amount,
      0
    );

    res.json({
      status: 200,
      count: overdueCredits.length,
      totalOverdueAmount,
      overdueCredits,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get payment credits by vendor
// @route   GET /api/payment-credits/vendor/:vendorMobile
const getVendorCredits = async (req, res) => {
  try {
    const { vendorMobile } = req.params;

    const paymentCredits = await PaymentCredit.find({
      vendor_mobile: vendorMobile,
    })
      .populate("order_id", "order_number grand_total order_status")
      .populate("created_by", "full_name email")
      .sort({ createdAt: -1 });

    const summary = {
      total_credit: paymentCredits.reduce((sum, c) => sum + c.total_amount, 0),
      total_paid: paymentCredits.reduce((sum, c) => sum + c.paid_amount, 0),
      total_remaining: paymentCredits.reduce(
        (sum, c) => sum + c.remaining_amount,
        0
      ),
      total_entries: paymentCredits.length,
    };

    res.json({ status: 200, summary, paymentCredits });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// ==================== PAYMENT CREDIT DASHBOARD ====================

// @desc    Get payment credit dashboard summary
// @route   GET /api/payment-credits/dashboard/summary
const getPaymentCreditDashboard = async (req, res) => {
  try {
    const { from, to } = req.query;
    const { today, tomorrow } = getTodayRange();
    const now = new Date();

    // Date filter for custom range
    const dateFilter = {};
    if (from || to) {
      dateFilter.createdAt = {};
      if (from) dateFilter.createdAt.$gte = new Date(from);
      if (to) dateFilter.createdAt.$lte = new Date(to);
    }

    // Today's stats
    const todayFilter = { createdAt: { $gte: today, $lt: tomorrow } };
    const todayCredits = await PaymentCredit.find(todayFilter);
    const todayTotalCredit = todayCredits.reduce(
      (sum, c) => sum + c.total_amount,
      0
    );
    const todayCollected = todayCredits.reduce(
      (sum, c) => sum + c.paid_amount,
      0
    );

    // Overall stats
    const allCredits = await PaymentCredit.find(dateFilter);
    const totalCreditAmount = allCredits.reduce(
      (sum, c) => sum + c.total_amount,
      0
    );
    const totalCollected = allCredits.reduce(
      (sum, c) => sum + c.paid_amount,
      0
    );
    const totalPending = allCredits.reduce(
      (sum, c) => sum + c.remaining_amount,
      0
    );

    // Payment status breakdown
    const statusBreakdown = {
      pending: allCredits.filter((c) => c.payment_status === "pending").length,
      partial: allCredits.filter((c) => c.payment_status === "partial").length,
      paid: allCredits.filter((c) => c.payment_status === "paid").length,
      overdue: allCredits.filter((c) => c.payment_status === "overdue").length,
    };

    // Overdue stats
    const overdueCredits = allCredits.filter(
      (c) =>
        c.due_date &&
        c.due_date < now &&
        c.payment_status !== "paid"
    );
    const totalOverdue = overdueCredits.reduce(
      (sum, c) => sum + c.remaining_amount,
      0
    );

    // Collection rate
    const collectionRate =
      totalCreditAmount > 0
        ? ((totalCollected / totalCreditAmount) * 100).toFixed(2)
        : 0;

    // Top 5 vendors by outstanding amount
    const vendorOutstanding = {};
    allCredits
      .filter((c) => c.payment_status !== "paid")
      .forEach((credit) => {
        const key = credit.vendor_mobile || credit.vendor_name;
        if (!vendorOutstanding[key]) {
          vendorOutstanding[key] = {
            vendor_name: credit.vendor_name,
            vendor_mobile: credit.vendor_mobile,
            total_outstanding: 0,
            total_credits: 0,
          };
        }
        vendorOutstanding[key].total_outstanding += credit.remaining_amount;
        vendorOutstanding[key].total_credits++;
      });

    const topOutstandingVendors = Object.values(vendorOutstanding)
      .sort((a, b) => b.total_outstanding - a.total_outstanding)
      .slice(0, 5);

    // Payment mode breakdown (from payment history)
    const modeBreakdown = { cash: 0, upi: 0, bank_transfer: 0, cheque: 0 };
    allCredits.forEach((credit) => {
      credit.payment_history.forEach((payment) => {
        if (modeBreakdown[payment.payment_mode] !== undefined) {
          modeBreakdown[payment.payment_mode] += payment.amount;
        }
      });
    });

    // Recent 10 credits
    const recentCredits = await PaymentCredit.find()
      .populate("order_id", "order_number")
      .populate("created_by", "full_name email")
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        "vendor_name invoice_number total_amount paid_amount remaining_amount payment_status due_date"
      );

    // Upcoming dues (next 7 days)
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const upcomingDues = await PaymentCredit.find({
      due_date: { $gte: now, $lte: next7Days },
      payment_status: { $in: ["pending", "partial"] },
    })
      .populate("order_id", "order_number")
      .sort({ due_date: 1 })
      .select(
        "vendor_name vendor_mobile invoice_number remaining_amount due_date payment_status"
      );

    res.json({
      status: 200,
      dashboard: {
        today: {
          new_credits: todayCredits.length,
          total_credit: todayTotalCredit,
          collected: todayCollected,
        },
        overall: {
          total_entries: allCredits.length,
          total_credit_amount: totalCreditAmount,
          total_collected: totalCollected,
          total_pending: totalPending,
          collection_rate: `${collectionRate}%`,
        },
        overdue: {
          count: overdueCredits.length,
          total_amount: totalOverdue,
        },
        statusBreakdown,
        modeBreakdown,
        topOutstandingVendors,
        upcomingDues,
        recentCredits,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get salesman-wise credit report
// @route   GET /api/payment-credits/dashboard/salesman-report
const getSalesmanCreditReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const credits = await PaymentCredit.find(filter).populate(
      "created_by",
      "full_name email headquarter_name"
    );

    const salesmanData = {};
    credits.forEach((credit) => {
      const key = credit.created_by?._id?.toString();
      if (!key) return;

      if (!salesmanData[key]) {
        salesmanData[key] = {
          _id: credit.created_by._id,
          full_name: credit.created_by.full_name,
          email: credit.created_by.email,
          headquarter_name: credit.created_by.headquarter_name,
          total_credits: 0,
          total_amount: 0,
          collected_amount: 0,
          pending_amount: 0,
          overdue_count: 0,
        };
      }

      salesmanData[key].total_credits++;
      salesmanData[key].total_amount += credit.total_amount;
      salesmanData[key].collected_amount += credit.paid_amount;
      salesmanData[key].pending_amount += credit.remaining_amount;
      if (credit.payment_status === "overdue") {
        salesmanData[key].overdue_count++;
      }
    });

    const report = Object.values(salesmanData).sort(
      (a, b) => b.pending_amount - a.pending_amount
    );

    res.json({ status: 200, count: report.length, report });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get vendor-wise credit report
// @route   GET /api/payment-credits/dashboard/vendor-report
const getVendorCreditReport = async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};

    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const credits = await PaymentCredit.find(filter);

    const vendorData = {};
    credits.forEach((credit) => {
      const key = credit.vendor_mobile || credit.vendor_name;

      if (!vendorData[key]) {
        vendorData[key] = {
          vendor_name: credit.vendor_name,
          vendor_mobile: credit.vendor_mobile,
          total_credits: 0,
          total_amount: 0,
          paid_amount: 0,
          pending_amount: 0,
          overdue_count: 0,
          last_payment_date: null,
        };
      }

      vendorData[key].total_credits++;
      vendorData[key].total_amount += credit.total_amount;
      vendorData[key].paid_amount += credit.paid_amount;
      vendorData[key].pending_amount += credit.remaining_amount;
      if (credit.payment_status === "overdue") {
        vendorData[key].overdue_count++;
      }
      if (
        credit.payment_date &&
        (!vendorData[key].last_payment_date ||
          credit.payment_date > vendorData[key].last_payment_date)
      ) {
        vendorData[key].last_payment_date = credit.payment_date;
      }
    });

    const report = Object.values(vendorData).sort(
      (a, b) => b.pending_amount - a.pending_amount
    );

    res.json({ status: 200, count: report.length, report });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = {
  createPaymentCredit,
  getAllPaymentCredits,
  getMyPaymentCredits,
  getPaymentCreditById,
  updatePaymentCredit,
  recordPayment,
  deletePaymentCredit,
  getOverdueCredits,
  getVendorCredits,
  getPaymentCreditDashboard,
  getSalesmanCreditReport,
  getVendorCreditReport,
};
