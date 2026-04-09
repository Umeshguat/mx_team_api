const ReturnRequest = require('../models/ReturnRequestModel');
const Order = require('../models/orderModel');
const Delivery = require('../models/deliveryModel');
const ShopMaster = require('../models/shopMasterModel');
const User = require('../models/userModel');


const createReturnRequest = async (req, res) => {

    try {

        const { order_id, sales_person_id, product_id, reason, unit } = req.body;

        // Validate required fields
        if (!order_id || !sales_person_id || !product_id || !unit) {
            return res.status(400).json({ 
                status: 400,
                message: "Order ID, Sales person ID, Product ID and Unit are required"
                });
        }

        const newReturnRequest = new ReturnRequest({
            order_id,
            sales_person_id,
            product_id,
            reason,
            unit
        });
        const savedReturnRequest = await newReturnRequest.save();

        res.status(201).json({
            status: 201,
            message: "Return request created successfully",
            data: savedReturnRequest
        });

    } catch (error) {
        res.status(500).json({ 
            status:500,
            message: error.message,
         });
    }
};



// @desc    Get all return requests for the logged-in distributor (paginated)
// @route   GET /api/return-requests/distributor
const getReturnRequestsForDistributor = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;
        const { status, qc_status, refund_status } = req.query;

        // Find all salespersons belonging to this distributor
        const user_id = req.user._id;
        const salespersons = await User.find(
            {  distributor_id: user_id },

        );


        const salespersonIds = salespersons.map((s) => s._id);
         console.log(`salespersonIds: ${salespersonIds}`);

        const filter = { sales_person_id: { $in: salespersonIds } };
        if (status) filter.status = status;
        if (qc_status) filter.qc_status = qc_status;
        if (refund_status) filter.refund_status = refund_status;

        const [returnRequests, total] = await Promise.all([
            ReturnRequest.find(filter)
                .populate('product_id')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ReturnRequest.countDocuments(filter),
        ]);

        res.status(200).json({
            status: 200,
            message: "Return requests fetched successfully",
            data: returnRequests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            status: 500,
            message: error.message,
        });
    }
};

// @desc    Get all return requests for the logged-in salesperson (paginated)
// @route   GET /api/return-requests/sales
const getReturnRequestsForSalesperson = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;
        const { status, qc_status, refund_status } = req.query;

        const filter = { sales_person_id: req.user._id };
        if (status) filter.status = status;
        if (qc_status) filter.qc_status = qc_status;
        if (refund_status) filter.refund_status = refund_status;

        const [returnRequests, total] = await Promise.all([
            ReturnRequest.find(filter)
                .populate('product_id')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ReturnRequest.countDocuments(filter),
        ]);

        res.status(200).json({
            status: 200,
            message: "Return requests fetched successfully",
            data: returnRequests,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
};

// @desc    Get a single return request by ID
// @route   GET /api/return-requests/:id
const getReturnRequestById = async (req, res) => {
    try {
        const { id } = req.params;

        const returnRequest = await ReturnRequest.findById(id)
            .populate('product_id')
            .populate('sales_person_id')
            .populate('delivery_agent_id');

        if (!returnRequest) {
            return res.status(404).json({ status: 404, message: "Return request not found" });
        }

        const data = returnRequest.toObject();

        // Remove all ID fields
        delete data._id;
        delete data.order_id;
        delete data.sales_person_id?._id;
        delete data.product_id?._id;
        delete data.delivery_agent_id?._id;

        res.status(200).json({
            status: 200,
            message: "Return request fetched successfully",
            data,
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
};

// @desc    Update return request status by distributor; auto-assign delivery agent if approved
// @route   PUT /api/return-requests/:id/status
const updateReturnRequestStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !["requested", "approved", "rejected"].includes(status)) {
            return res.status(400).json({
                status: 400,
                message: "Valid status is required (requested, approved, rejected)",
            });
        }

        const returnRequest = await ReturnRequest.findById(id);
        if (!returnRequest) {
            return res.status(404).json({ status: 404, message: "Return request not found" });
        }

        // Verify the order belongs to this distributor
        const order = await Order.findOne({
            $or: [
                { _id: returnRequest.order_id.match(/^[0-9a-fA-F]{24}$/) ? returnRequest.order_id : null },
                { order_number: returnRequest.order_id },
            ],
            created_by: req.user._id,
        });

        if (!order) {
            return res.status(403).json({
                status: 403,
                message: "Not authorized to update this return request",
            });
        }

        returnRequest.status = status;

        if (status === "approved") {
            // Find the delivery to get the agent who delivered the order
            const delivery = await Delivery.findOne({ order_id: order._id });
            if (delivery && delivery.assigned_to) {
                returnRequest.delivery_agent_id = delivery.assigned_to;
            }
        }

        const updated = await returnRequest.save();

        res.status(200).json({
            status: 200,
            message: "Return request status updated successfully",
            data: updated,
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
};

// Helper: load order for a return request (order_id may be _id or order_number)
const findOrderForReturn = async (returnRequest) => {
    const orQuery = [{ order_number: returnRequest.order_id }];
    if (/^[0-9a-fA-F]{24}$/.test(returnRequest.order_id)) {
        orQuery.push({ _id: returnRequest.order_id });
    }
    return Order.findOne({ $or: orQuery });
};

// @desc    Delivery agent receives returned product, sets QC and computes refund amount
// @route   PUT /api/return-requests/:id/receive
const receiveReturnedProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { qc_status } = req.body;

        if (!qc_status || !["passed", "failed"].includes(qc_status)) {
            return res.status(400).json({
                status: 400,
                message: "qc_status is required (passed or failed)",
            });
        }

        const returnRequest = await ReturnRequest.findById(id);
        if (!returnRequest) {
            return res.status(404).json({ status: 404, message: "Return request not found" });
        }

        if (returnRequest.status !== "approved") {
            return res.status(400).json({
                status: 400,
                message: "Return request must be approved before receiving",
            });
        }

        // Only the assigned delivery agent can receive
        if (
            !returnRequest.delivery_agent_id ||
            String(returnRequest.delivery_agent_id) !== String(req.user._id)
        ) {
            return res.status(403).json({
                status: 403,
                message: "Not authorized to receive this return",
            });
        }

        returnRequest.recevied_date = new Date();
        returnRequest.qc_status = qc_status;

        if (qc_status === "passed") {
            const order = await findOrderForReturn(returnRequest);
            if (!order) {
                return res.status(404).json({ status: 404, message: "Related order not found" });
            }

            const item = order.items.find(
                (it) => String(it.product_id) === String(returnRequest.product_id)
            );
            if (!item) {
                return res.status(404).json({
                    status: 404,
                    message: "Product not found in original order",
                });
            }

            const units = parseFloat(returnRequest.unit) || 0;
            returnRequest.refund_amount = +(item.unit_price * units).toFixed(2);
            returnRequest.refund_status = "processed";
        } else {
            returnRequest.refund_amount = 0;
            returnRequest.refund_status = "pending";
        }

        const updated = await returnRequest.save();
        res.status(200).json({
            status: 200,
            message: "Return product received successfully",
            data: updated,
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
};

// @desc    Complete refund and credit the shop's wallet for next use
// @route   PUT /api/return-requests/:id/complete-refund
const completeRefund = async (req, res) => {
    try {
        const { id } = req.params;

        const returnRequest = await ReturnRequest.findById(id);
        if (!returnRequest) {
            return res.status(404).json({ status: 404, message: "Return request not found" });
        }

        if (returnRequest.refund_status !== "processed") {
            return res.status(400).json({
                status: 400,
                message: "Refund must be in processed state to complete",
            });
        }

        const order = await findOrderForReturn(returnRequest);
        if (!order) {
            return res.status(404).json({ status: 404, message: "Related order not found" });
        }

        // Authorize: only the distributor who owns the order
        if (String(order.created_by) !== String(req.user._id)) {
            return res.status(403).json({
                status: 403,
                message: "Not authorized to complete this refund",
            });
        }

        // Add refund amount to the shop's credit balance for next use
        const shop = await ShopMaster.findOne({ shop_mobile: order.vendor_mobile });
        if (shop) {
            shop.credit_balance = (shop.credit_balance || 0) + (returnRequest.refund_amount || 0);
            await shop.save();
        }

        returnRequest.refund_status = "completed";
        const updated = await returnRequest.save();

        res.status(200).json({
            status: 200,
            message: "Refund completed and credited to shop",
            data: updated,
            shop_credit_balance: shop ? shop.credit_balance : null,
        });
    } catch (error) {
        res.status(500).json({ status: 500, message: error.message });
    }
};

module.exports = {
    createReturnRequest,
    getReturnRequestsForDistributor,
    updateReturnRequestStatus,
    receiveReturnedProduct,
    completeRefund,
    getReturnRequestById,
    getReturnRequestsForSalesperson,
};