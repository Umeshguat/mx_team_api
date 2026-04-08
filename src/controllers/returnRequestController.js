const ReturnRequest = require('../models/ReturnRequestModel');



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



module.exports = {
    createReturnRequest,
};