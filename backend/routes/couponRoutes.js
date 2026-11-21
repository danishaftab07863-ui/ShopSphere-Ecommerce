
const express = require("express");
const router = express.Router();

const {
    createCoupon,
    getAllCoupons,
    validateCoupon,
    updateCoupon,
    deleteCoupon
} = require("../controllers/couponController");

const {
    protect,
    adminOnly
} = require("../middleware/authMiddleware");

// USER: Validate Coupon
router.post("/validate", protect, validateCoupon);

// ADMIN: Manage Coupons
router.post("/", protect, adminOnly, createCoupon);

router.get("/", protect, adminOnly, getAllCoupons);

router.put("/:id", protect, adminOnly, updateCoupon);

router.delete("/:id", protect, adminOnly, deleteCoupon);

module.exports = router;
