
const crypto = require("crypto");
const Order = require("../models/Order");
const razorpay = require("../config/razorpay");

// CREATE RAZORPAY PAYMENT ORDER
exports.createRazorpayOrder = async (req, res) => {
    try {
        const { id } = req.params;

        if (!crypto.randomBytes) {
            return res.status(500).json({
                message: "Payment service unavailable."
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

        if (order.paymentStatus === "Paid") {
            return res.status(400).json({
                message: "This order is already paid."
            });
        }

        const amount = Math.round(order.totalAmount * 100);

        if (!Number.isSafeInteger(amount) || amount <= 0) {
            return res.status(400).json({
                message: "Invalid payment amount."
            });
        }

        // Reuse an existing Razorpay order if already created
        if (!order.razorpayOrderId) {
            const razorpayOrder = await razorpay.orders.create({
                amount,
                currency: "INR",
                receipt: `receipt_${order._id}`,
                notes: {
                    databaseOrderId: order._id.toString(),
                    userId: req.user.id.toString()
                }
            });

            order.razorpayOrderId = razorpayOrder.id;
            order.paymentMethod = "Razorpay";

            await order.save();
        }

        res.status(200).json({
            message: "Payment order created successfully.",
            key: process.env.RAZORPAY_KEY_ID,
            razorpayOrderId: order.razorpayOrderId,
            amount,
            currency: "INR",
            orderId: order._id
        });

    } catch (error) {
        console.error("Create Razorpay Order Error:", error.message);

        res.status(500).json({
            message: "Unable to create payment order."
        });
    }
};


// VERIFY RAZORPAY PAYMENT
exports.verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            orderId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (
            !orderId ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                message: "Payment verification details are missing."
            });
        }

        const order = await Order.findOne({
            _id: orderId,
            user: req.user.id
        });

        if (!order) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        // Prevent payment verification for another Razorpay order
        if (order.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({
                message: "Payment order does not match."
            });
        }

        // Prevent duplicate or different payment attempts
        if (order.paymentStatus === "Paid") {
            if (order.razorpayPaymentId === razorpay_payment_id) {
                return res.status(200).json({
                    message: "Payment already verified.",
                    paymentStatus: "Paid",
                    order
                });
            }

            return res.status(409).json({
                message: "This order has already been paid."
            });
        }

        // Generate signature using the order ID stored in our database
        const generatedSignature = crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(
                `${order.razorpayOrderId}|${razorpay_payment_id}`
            )
            .digest("hex");

        const receivedBuffer = Buffer.from(
            razorpay_signature,
            "hex"
        );

        const generatedBuffer = Buffer.from(
            generatedSignature,
            "hex"
        );

        if (
            receivedBuffer.length !== generatedBuffer.length ||
            !crypto.timingSafeEqual(
                receivedBuffer,
                generatedBuffer
            )
        ) {
            return res.status(400).json({
                message: "Invalid payment signature."
            });
        }

        // Fetch actual payment details from Razorpay
        const payment = await razorpay.payments.fetch(
            razorpay_payment_id
        );

        const expectedAmount = Math.round(
            order.totalAmount * 100
        );

        if (
            payment.order_id !== order.razorpayOrderId ||
            payment.amount !== expectedAmount ||
            payment.currency !== "INR"
        ) {
            return res.status(400).json({
                message: "Payment details do not match the order."
            });
        }

        // Mark as paid only after Razorpay confirms capture
        if (payment.status !== "captured") {
            return res.status(409).json({
                message: "Payment is not captured yet. Please check again."
            });
        }

        order.paymentStatus = "Paid";
        order.paymentMethod = "Razorpay";
        order.razorpayPaymentId = razorpay_payment_id;

        await order.save();

        res.status(200).json({
            message: "Payment verified successfully!",
            paymentStatus: order.paymentStatus,
            order
        });

    } catch (error) {
        console.error("Payment Verification Error:", error.message);

        res.status(500).json({
            message: "Unable to verify payment."
        });
    }
};
