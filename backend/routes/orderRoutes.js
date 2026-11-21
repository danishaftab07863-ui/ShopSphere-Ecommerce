
const express = require("express");
const router = express.Router();

const {
    createOrder,
    processDemoPayment,
    getMyOrders,
    deleteMyOrder
} = require("../controllers/orderController");

const { protect } = require("../middleware/authMiddleware");

// Place a new order
router.post("/", protect, createOrder);

// Process simulated demo payment
router.post("/:id/demo-payment", protect, processDemoPayment);

// Get logged-in user's orders
router.get("/my-orders", protect, getMyOrders);

// Delete pending order
router.delete("/:id", protect, deleteMyOrder);

module.exports = router;
