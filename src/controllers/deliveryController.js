const Delivery = require("../models/deliveryModel");
const Order = require("../models/orderModel");

// @desc    Assign delivery to employee
// @route   POST /api/deliveries

//@route   POST /api/deliveries/dashboard
const getDashboardData = async (req, res) => {
  try {
    const filter = { assigned_to: req.user._id };
    const totalDeliveries = await Delivery.countDocuments(filter);
    const pendingDeliveries = await Delivery.countDocuments({ ...filter, delivery_status: "assigned" });
    const inTransitDeliveries = await Delivery.countDocuments({ ...filter, delivery_status: "in_transit" });
    const deliveredDeliveries = await Delivery.countDocuments({ ...filter, delivery_status: "delivered" });
    const deliveredToday = await Delivery.countDocuments({
      ...filter,
      delivery_status: "delivered",
      delivered_at: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lte: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    });

    const latestDeliveries = await Delivery.find(filter)
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      status: 200,
      message: "Dashboard data retrieved successfully",
      data: {
        totalDeliveries,
        pendingDeliveries,
        inTransitDeliveries,
        deliveredDeliveries,
        deliveredToday,
        latestDeliveries,
      },
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};
const createDelivery = async (req, res) => {
  try {
    const {
      order_id,
      assigned_to,
      delivery_address,
      priority,
      scheduled_date,
    } = req.body;

    if (!order_id || !assigned_to) {
      return res.status(400).json({
        status: 400,
        message: "order_id and assigned_to are required",
      });
    }

    const order = await Order.findById(order_id);
    if (!order) {
      return res
        .status(404)
        .json({ status: 404, message: "Order not found" });
    }

    // Check if delivery already exists for this order
    const existing = await Delivery.findOne({ order_id });
    if (existing) {
      return res.status(400).json({
        status: 400,
        message: "Delivery already assigned for this order",
      });
    }

    const delivery = await Delivery.create({
      order_id: order._id,
      order_number: order.order_number,
      assigned_to,
      vendor_name: order.vendor_name,
      vendor_mobile: order.vendor_mobile,
      delivery_address: delivery_address || order.delivery_address || {},
      priority: priority || "medium",
      scheduled_date: scheduled_date || null,
    });

    // Update order status to confirmed if pending
    if (order.order_status === "pending") {
      order.order_status = "confirmed";
      await order.save();
    }

    res.status(201).json({
      status: 201,
      message: "Delivery assigned successfully",
      delivery,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get all deliveries
// @route   GET /api/deliveries
const getAllDeliveries = async (req, res) => {
  try {
    const { delivery_status, assigned_to, priority, from, to, search } =
      req.query;

    const filter = {};

    if (delivery_status) filter.delivery_status = delivery_status;
    if (assigned_to) filter.assigned_to = assigned_to;
    if (priority) filter.priority = priority;
    if (search) {
      filter.$or = [
        { order_number: { $regex: search, $options: "i" } },
        { vendor_name: { $regex: search, $options: "i" } },
        { vendor_mobile: { $regex: search, $options: "i" } },
      ];
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const deliveries = await Delivery.find(filter)
      .populate("assigned_to", "full_name email phone_number headquarter_name")
      .populate("order_id", "order_number grand_total order_status payment_status")
      .sort({ createdAt: -1 });

    res.json({ status: 200, count: deliveries.length, deliveries });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get my assigned deliveries (logged-in employee)
// @route   POST /api/deliveries/my-deliveries
const getMyDeliveries = async (req, res) => {
  try {
    const { delivery_status, priority, from, to, page = 1, limit = 10 } = req.body;
    const filter = { assigned_to: req.user._id };

    if (delivery_status) filter.delivery_status = delivery_status;
    if (priority) filter.priority = priority;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const userFilter = { assigned_to: req.user._id };

    const [deliveries, total, totalPending, totalInTransit, totalDelivered] = await Promise.all([
      Delivery.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Delivery.countDocuments(filter),
      Delivery.countDocuments({ ...userFilter, delivery_status: "assigned" }),
      Delivery.countDocuments({ ...userFilter, delivery_status: "in_transit" }),
      Delivery.countDocuments({ ...userFilter, delivery_status: "delivered" }),
    ]);

    res.json({
      status: 200,
      count: deliveries.length,
      total,
      totalPending,
      totalInTransit,
      totalDelivered,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      deliveries,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Get delivery by ID
// @route   GET /api/deliveries/:id
const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate("assigned_to", "full_name email phone_number headquarter_name")
      .populate({
        path: "order_id",
        populate: { path: "items.product_id", select: "product_name product_code image" },
      });

    if (!delivery) {
      return res
        .status(404)
        .json({ status: 404, message: "Delivery not found" });
    }

    res.json({ status: 200, delivery });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Update delivery (reassign, change address, priority, etc.)
// @route   PUT /api/deliveries/:id
const updateDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res
        .status(404)
        .json({ status: 404, message: "Delivery not found" });
    }

    if (delivery.delivery_status === "delivered") {
      return res.status(400).json({
        status: 400,
        message: "Cannot update a delivered delivery",
      });
    }

    const {
      assigned_to,
      delivery_address,
      priority,
      scheduled_date,
    } = req.body;

    if (assigned_to !== undefined) delivery.assigned_to = assigned_to;
    if (priority !== undefined) delivery.priority = priority;
    if (scheduled_date !== undefined) delivery.scheduled_date = scheduled_date;

    if (delivery_address !== undefined) {
      if (delivery_address.address !== undefined)
        delivery.delivery_address.address = delivery_address.address;
      if (delivery_address.city !== undefined)
        delivery.delivery_address.city = delivery_address.city;
      if (delivery_address.state !== undefined)
        delivery.delivery_address.state = delivery_address.state;
      if (delivery_address.pincode !== undefined)
        delivery.delivery_address.pincode = delivery_address.pincode;
      if (delivery_address.location !== undefined)
        delivery.delivery_address.location = delivery_address.location;
    }

    await delivery.save();

    res.json({
      status: 200,
      message: "Delivery updated successfully",
      delivery,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Update delivery status
// @route   PUT /api/deliveries/:id/status
const updateDeliveryStatus = async (req, res) => {
  try {
    const {
      delivery_status,
      delivery_proof,
    } = req.body;

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res
        .status(404)
        .json({ status: 404, message: "Delivery not found" });
    }

    delivery.delivery_status = delivery_status;

    if (delivery_status === "picked_up") {
      delivery.picked_up_at = new Date();
    }

    if (delivery_status === "delivered") {
      delivery.delivered_at = new Date();

      if (delivery_proof) {
        if (delivery_proof.image_url)
          delivery.delivery_proof.image_url = delivery_proof.image_url;
        if (delivery_proof.signature_url)
          delivery.delivery_proof.signature_url = delivery_proof.signature_url;
        if (delivery_proof.received_by)
          delivery.delivery_proof.received_by = delivery_proof.received_by;
      }

      // Sync order status to delivered
      const order = await Order.findById(delivery.order_id);
      if (order) {
        order.order_status = "delivered";
        order.delivered_date = new Date();
        await order.save();
      }
    }

    await delivery.save();

    res.json({
      status: 200,
      message: `Delivery status updated to ${delivery_status}`,
      delivery,
    });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

// @desc    Delete delivery
// @route   DELETE /api/deliveries/:id
const deleteDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res
        .status(404)
        .json({ status: 404, message: "Delivery not found" });
    }

    if (delivery.delivery_status === "delivered") {
      return res.status(400).json({
        status: 400,
        message: "Cannot delete a completed delivery",
      });
    }

    await delivery.deleteOne();

    res.json({ status: 200, message: "Delivery deleted successfully" });
  } catch (error) {
    res.status(500).json({ status: 500, message: error.message });
  }
};

module.exports = {
  createDelivery,
  getAllDeliveries,
  getMyDeliveries,
  getDeliveryById,
  updateDelivery,
  updateDeliveryStatus,
  deleteDelivery,
  getDashboardData,
};
