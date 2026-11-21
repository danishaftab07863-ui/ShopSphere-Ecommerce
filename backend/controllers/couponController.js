
const Coupon = require("../models/Coupon");

// CREATE COUPON (ADMIN)
const createCoupon = async (req, res) => {
    try {
        const {
            code,
            discountPercentage,
            minOrderAmount,
            expiryDate,
            usageLimit
        } = req.body;

        if (
            !code ||
            !discountPercentage ||
            !expiryDate
        ) {
            return res.status(400).json({
                message: "Please provide coupon code, discount and expiry date"
            });
        }

        if (
            !Number.isFinite(Number(discountPercentage)) ||
            Number(discountPercentage) < 1 ||
            Number(discountPercentage) > 100
        ) {
            return res.status(400).json({
                message: "Discount must be between 1 and 100"
            });
        }

        if (new Date(expiryDate) <= new Date()) {
            return res.status(400).json({
                message: "Expiry date must be in the future"
            });
        }

        const existingCoupon = await Coupon.findOne({
            code: code.trim().toUpperCase()
        });

        if (existingCoupon) {
            return res.status(400).json({
                message: "Coupon code already exists"
            });
        }

        const coupon = await Coupon.create({
            code: code.trim().toUpperCase(),
            discountPercentage,
            minOrderAmount: minOrderAmount || 0,
            expiryDate,
            usageLimit: usageLimit || 100
        });

        res.status(201).json({
            message: "Coupon created successfully",
            coupon
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// GET ALL COUPONS (ADMIN)
const getAllCoupons = async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({
            createdAt: -1
        });

        res.status(200).json(coupons);

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// VALIDATE COUPON (USER)
const validateCoupon = async (req, res) => {
    try {
        const { code, orderAmount } = req.body;

        const amount = Number(orderAmount);

        if (
            !code ||
            !Number.isFinite(amount) ||
            amount < 0
        ) {
            return res.status(400).json({
                message: "Valid coupon code and order amount are required"
            });
        }

        const coupon = await Coupon.findOne({
            code: code.trim().toUpperCase()
        });

        if (!coupon || !coupon.isActive) {
            return res.status(404).json({
                message: "Invalid coupon code"
            });
        }

        if (new Date(coupon.expiryDate) <= new Date()) {
            return res.status(400).json({
                message: "Coupon has expired"
            });
        }

        if (coupon.usedCount >= coupon.usageLimit) {
            return res.status(400).json({
                message: "Coupon usage limit reached"
            });
        }

        if (amount < coupon.minOrderAmount) {
            return res.status(400).json({
                message: `Minimum order amount is ₹${coupon.minOrderAmount}`
            });
        }

        const discountAmount =
            (amount * coupon.discountPercentage) / 100;

        res.status(200).json({
            message: "Coupon applied successfully",
            coupon: {
                code: coupon.code,
                discountPercentage: coupon.discountPercentage
            },
            discountAmount,
            finalAmount: amount - discountAmount
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// UPDATE COUPON (ADMIN)
const updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);

        if (!coupon) {
            return res.status(404).json({
                message: "Coupon not found"
            });
        }

        const allowedFields = [
            "discountPercentage",
            "minOrderAmount",
            "expiryDate",
            "usageLimit",
            "isActive"
        ];

        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                coupon[field] = req.body[field];
            }
        });

        await coupon.save();

        res.status(200).json({
            message: "Coupon updated successfully",
            coupon
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

// DELETE COUPON (ADMIN)
const deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(
            req.params.id
        );

        if (!coupon) {
            return res.status(404).json({
                message: "Coupon not found"
            });
        }

        res.status(200).json({
            message: "Coupon deleted successfully"
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    createCoupon,
    getAllCoupons,
    validateCoupon,
    updateCoupon,
    deleteCoupon
};
