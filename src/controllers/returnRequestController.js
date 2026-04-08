const ReturnRequest = require('../models/ReturnRequest');



const createReturnRequest = async (req, res) => {

    try {


        res.status(201).json({
            status: 201,
            message: "Return request created successfully",
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