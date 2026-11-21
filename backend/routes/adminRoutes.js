const express = require("express");
const router = express.Router();

const {
    getDashboardStats,
    getSalesAnalytics,
    getAllOrders,
    updateOrderStatus
} = require("../controllers/adminController");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");

// All routes require admin authentication
router.use(protect, adminOnly);

router.get("/stats", getDashboardStats);
router.get("/analytics", getSalesAnalytics);
router.get("/orders", getAllOrders);
router.put("/orders/:id/status", updateOrderStatus);

module.exports = router;