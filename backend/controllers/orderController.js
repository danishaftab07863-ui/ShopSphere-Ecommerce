
const Order = require("../models/Order");
const Product = require("../models/Product");
const Coupon = require("../models/Coupon");
const mongoose = require("mongoose");


// RESTORE RESERVED STOCK
const restoreReservedStock = async (reservedStock) => {
    for (const item of reservedStock) {
        await Product.updateOne(
            { _id: item.productId },
            { $inc: { stock: item.quantity } }
        );
    }
};


// RESTORE COUPON USAGE
const restoreCouponUsage = async (coupon) => {
    if (!coupon) return;

    await Coupon.updateOne(
        {
            _id: coupon._id,
            usedCount: { $gt: 0 }
        },
        {
            $inc: { usedCount: -1 }
        }
    );
};


// PLACE NEW ORDER
const createOrder = async (req, res) => {
    let reservedCoupon = null;
    const reservedStock = [];

    try {
        const {
            items,
            shippingAddress,
            couponCode
        } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                message: "Your cart is empty."
            });
        }

        if (!shippingAddress) {
            return res.status(400).json({
                message: "Shipping address is required."
            });
        }

        const requiredFields = [
            "fullName",
            "phone",
            "address",
            "city",
            "state",
            "pincode"
        ];

        for (const field of requiredFields) {
            if (
                typeof shippingAddress[field] !== "string" ||
                !shippingAddress[field].trim()
            ) {
                return res.status(400).json({
                    message: `${field} is required.`
                });
            }
        }

        // COMBINE DUPLICATE PRODUCTS
        const productQuantities = new Map();

        for (const item of items) {
            const quantity = Number(item.quantity);

            if (
                !item.product ||
                !mongoose.Types.ObjectId.isValid(item.product) ||
                !Number.isInteger(quantity) ||
                quantity < 1
            ) {
                return res.status(400).json({
                    message: "Invalid order item."
                });
            }

            const productId = String(item.product);

            productQuantities.set(
                productId,
                (productQuantities.get(productId) || 0) + quantity
            );
        }

        const orderItems = [];
        let subtotalAmount = 0;

        // VERIFY PRODUCTS AND CALCULATE SUBTOTAL
        for (const [productId, quantity] of productQuantities) {
            const product = await Product.findById(productId);

            if (!product) {
                return res.status(404).json({
                    message: "A product in your cart was not found."
                });
            }

            if (product.stock < quantity) {
                return res.status(400).json({
                    message: `Only ${product.stock} units of ${product.name} are available.`
                });
            }

            orderItems.push({
                product: product._id,
                name: product.name,
                price: product.price,
                quantity
            });

            subtotalAmount += product.price * quantity;
        }

        subtotalAmount = Number(subtotalAmount.toFixed(2));

        let discountPercentage = 0;
        let discountAmount = 0;
        let appliedCouponCode = null;

        // VERIFY AND RESERVE COUPON
        if (
            couponCode !== undefined &&
            couponCode !== null &&
            String(couponCode).trim() !== ""
        ) {
            const normalizedCode = String(couponCode)
                .trim()
                .toUpperCase();

            const coupon = await Coupon.findOne({
                code: normalizedCode
            });

            if (!coupon) {
                return res.status(400).json({
                    message: "Invalid coupon code."
                });
            }

            if (!coupon.isActive) {
                return res.status(400).json({
                    message: "This coupon is inactive."
                });
            }

            if (new Date(coupon.expiryDate) <= new Date()) {
                return res.status(400).json({
                    message: "This coupon has expired."
                });
            }

            if (coupon.usedCount >= coupon.usageLimit) {
                return res.status(400).json({
                    message: "Coupon usage limit has been reached."
                });
            }

            if (subtotalAmount < coupon.minOrderAmount) {
                return res.status(400).json({
                    message: `Minimum order amount for this coupon is ₹${coupon.minOrderAmount}.`
                });
            }

            // ATOMIC COUPON UPDATE
            reservedCoupon = await Coupon.findOneAndUpdate(
                {
                    _id: coupon._id,
                    isActive: true,
                    expiryDate: { $gt: new Date() },
                    $expr: {
                        $and: [
                            { $lt: ["$usedCount", "$usageLimit"] },
                            { $lte: ["$minOrderAmount", subtotalAmount] }
                        ]
                    }
                },
                {
                    $inc: { usedCount: 1 }
                },
                {
                    new: true
                }
            );

            if (!reservedCoupon) {
                return res.status(400).json({
                    message: "Coupon is no longer available. Please try again."
                });
            }

            discountPercentage = reservedCoupon.discountPercentage;

            discountAmount = Number(
                (
                    subtotalAmount *
                    discountPercentage /
                    100
                ).toFixed(2)
            );

            appliedCouponCode = reservedCoupon.code;
        }

        // AUTOMATIC STOCK DEDUCTION
        for (const [productId, quantity] of productQuantities) {
            const updatedProduct = await Product.findOneAndUpdate(
                {
                    _id: productId,
                    stock: { $gte: quantity }
                },
                {
                    $inc: { stock: -quantity }
                },
                {
                    new: true
                }
            );

            if (!updatedProduct) {
                // RESTORE PREVIOUSLY RESERVED STOCK
                await restoreReservedStock(reservedStock);
                reservedStock.length = 0;

                // RESTORE COUPON USAGE
                await restoreCouponUsage(reservedCoupon);
                reservedCoupon = null;

                return res.status(400).json({
                    message: "Product stock changed or is insufficient. Please refresh your cart."
                });
            }

            reservedStock.push({
                productId,
                quantity
            });
        }

        // CALCULATE FINAL AMOUNT
        const totalAmount = Number(
            Math.max(0, subtotalAmount - discountAmount).toFixed(2)
        );

        // CREATE ORDER
        const order = await Order.create({
            user: req.user.id,
            items: orderItems,

            shippingAddress: {
                fullName: shippingAddress.fullName.trim(),
                phone: shippingAddress.phone.trim(),
                address: shippingAddress.address.trim(),
                city: shippingAddress.city.trim(),
                state: shippingAddress.state.trim(),
                pincode: shippingAddress.pincode.trim()
            },

            subtotalAmount,
            couponCode: appliedCouponCode,
            discountPercentage,
            discountAmount,
            totalAmount,

            paymentStatus: "Pending",
            paymentMethod: "Not Selected"
        });

        // ORDER CREATED SUCCESSFULLY
        // Stock and coupon reservation are now committed.
        reservedCoupon = null;
        reservedStock.length = 0;

        res.status(201).json({
            message: "Order created successfully!",
            order
        });

    } catch (error) {

        // RESTORE STOCK IF ORDER CREATION FAILS
        if (reservedStock.length > 0) {
            try {
                await restoreReservedStock(reservedStock);
            } catch (stockError) {
                console.error(
                    "Stock rollback error:",
                    stockError.message
                );
            }
        }

        // RESTORE COUPON IF ORDER CREATION FAILS
        if (reservedCoupon) {
            try {
                await restoreCouponUsage(reservedCoupon);
            } catch (couponError) {
                console.error(
                    "Coupon rollback error:",
                    couponError.message
                );
            }
        }

        console.error("Create Order Error:", error.message);

        res.status(500).json({
            message: "Unable to place order."
        });
    }
};


// SIMULATED PAYMENT
const processDemoPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { result } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid order ID."
            });
        }

        if (!["success", "failure"].includes(result)) {
            return res.status(400).json({
                message: "Invalid demo payment result."
            });
        }

        const order = await Order.findOne({
            _id: id,
            user: req.user.id
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        if (order.status === "Cancelled") {
            return res.status(400).json({
                message: "Cancelled orders cannot be paid."
            });
        }

        if (order.paymentStatus !== "Pending") {
            return res.status(400).json({
                message: "Payment has already been processed."
            });
        }

        order.paymentMethod = "Demo Payment";

        order.paymentStatus =
            result === "success" ? "Paid" : "Failed";

        await order.save();

        res.status(200).json({
            message:
                result === "success"
                    ? "Demo payment successful!"
                    : "Demo payment failed!",

            paymentStatus: order.paymentStatus,
            paymentMethod: order.paymentMethod,
            order
        });

    } catch (error) {
        console.error("Demo Payment Error:", error.message);

        res.status(500).json({
            message: "Unable to process demo payment."
        });
    }
};


// GET LOGGED-IN USER ORDERS
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({
            user: req.user.id
        }).sort({ createdAt: -1 });

        res.status(200).json({
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("Get Orders Error:", error.message);

        res.status(500).json({
            message: "Unable to fetch orders."
        });
    }
};


// DELETE LOGGED-IN USER PENDING ORDER
const deleteMyOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                message: "Invalid order ID."
            });
        }

        const order = await Order.findOneAndDelete({
            _id: id,
            user: req.user.id,
            status: "Pending"
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found or cannot be deleted."
            });
        }

        // RESTORE STOCK AFTER ORDER DELETION
        for (const item of order.items) {
            await Product.updateOne(
                { _id: item.product },
                {
                    $inc: {
                        stock: item.quantity
                    }
                }
            );
        }

        res.status(200).json({
            message: "Order deleted successfully and product stock restored!"
        });

    } catch (error) {
        console.error("Delete Order Error:", error.message);

        res.status(500).json({
            message: "Unable to delete order."
        });
    }
};


module.exports = {
    createOrder,
    processDemoPayment,
    getMyOrders,
    deleteMyOrder
};
