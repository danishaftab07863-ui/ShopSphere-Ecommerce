
const Order = require("../models/Order");
const Product = require("../models/Product");


// ADMIN DASHBOARD STATS
const getDashboardStats = async (req, res) => {
    try {
        const totalOrders = await Order.countDocuments();
        const totalProducts = await Product.countDocuments();

        const salesResult = await Order.aggregate([
            {
                $match: {
                    paymentStatus: "Paid",
                    status: { $ne: "Cancelled" }
                }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$totalAmount" },
                    paidOrders: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            totalOrders,
            totalProducts,
            totalSales: salesResult[0]?.totalSales || 0,
            paidOrders: salesResult[0]?.paidOrders || 0
        });

    } catch (error) {
        console.error("Dashboard Error:", error.message);

        res.status(500).json({
            message: "Unable to fetch dashboard statistics."
        });
    }
};


// SALES ANALYTICS
const getSalesAnalytics = async (req, res) => {
    try {
        const startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        startDate.setMonth(startDate.getMonth() - 11);

        const paidOrderMatch = {
            paymentStatus: "Paid",
            status: { $ne: "Cancelled" }
        };

        const monthlyResults = await Order.aggregate([
            {
                $match: {
                    ...paidOrderMatch,
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: "%Y-%m",
                            date: "$createdAt"
                        }
                    },
                    revenue: { $sum: "$totalAmount" },
                    orders: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const monthlySales = [];

        for (let i = 0; i < 12; i++) {
            const date = new Date(startDate);
            date.setMonth(startDate.getMonth() + i);

            const monthKey = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0")
            ].join("-");

            const found = monthlyResults.find(
                (item) => item._id === monthKey
            );

            monthlySales.push({
                month: date.toLocaleDateString("en-IN", {
                    month: "short",
                    year: "2-digit"
                }),
                revenue: found?.revenue || 0,
                orders: found?.orders || 0
            });
        }

        // TOP 5 PRODUCTS
        const topProducts = await Order.aggregate([
            { $match: paidOrderMatch },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.name",
                    quantitySold: {
                        $sum: "$items.quantity"
                    },
                    revenue: {
                        $sum: {
                            $multiply: [
                                "$items.price",
                                "$items.quantity"
                            ]
                        }
                    }
                }
            },
            { $sort: { quantitySold: -1 } },
            { $limit: 5 },
            {
                $project: {
                    _id: 0,
                    name: {
                        $ifNull: ["$_id", "Unknown Product"]
                    },
                    quantitySold: 1,
                    revenue: 1
                }
            }
        ]);

        // ORDER STATUS ANALYTICS
        const orderStatus = await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            },
            {
                $project: {
                    _id: 0,
                    status: "$_id",
                    count: 1
                }
            },
            { $sort: { count: -1 } }
        ]);

        res.status(200).json({
            monthlySales,
            topProducts,
            orderStatus
        });

    } catch (error) {
        console.error("Sales Analytics Error:", error.message);

        res.status(500).json({
            message: "Unable to fetch sales analytics."
        });
    }
};


// GET ALL ORDERS
const getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate("user", "name email")
            .sort({ createdAt: -1 });

        res.status(200).json({
            count: orders.length,
            orders
        });

    } catch (error) {
        console.error("Get All Orders Error:", error.message);

        res.status(500).json({
            message: "Unable to fetch orders."
        });
    }
};


// UPDATE ORDER STATUS + TRACKING + STOCK RESTORATION
const updateOrderStatus = async (req, res) => {
    const restoredItems = [];

    try {
        const { status } = req.body;
        const { id } = req.params;

        const allowedStatuses = [
            "Pending",
            "Confirmed",
            "Shipped",
            "Delivered",
            "Cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status."
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        if (order.status === status) {
            return res.status(200).json({
                message: "Order already has this status.",
                order
            });
        }

        const previousStatus = order.status;

        // FIX MISSING FIELDS IN OLDER ORDERS
        if (order.subtotalAmount == null) {
            order.subtotalAmount = Number(
                order.items.reduce((total, item) => {
                    return total +
                        (Number(item.price) * Number(item.quantity));
                }, 0).toFixed(2)
            );
        }

        if (order.discountPercentage == null) {
            order.discountPercentage = 0;
        }

        if (order.discountAmount == null) {
            order.discountAmount = 0;
        }

        if (order.totalAmount == null) {
            order.totalAmount = Number(
                Math.max(
                    0,
                    order.subtotalAmount - order.discountAmount
                ).toFixed(2)
            );
        }

        // RESTORE STOCK ONLY WHEN ORDER IS CANCELLED
        if (
            status === "Cancelled" &&
            previousStatus !== "Cancelled"
        ) {
            for (const item of order.items) {
                const productId =
                    item.product?._id || item.product;

                const quantity = Number(item.quantity);

                if (
                    !productId ||
                    !Number.isInteger(quantity) ||
                    quantity <= 0
                ) {
                    throw new Error(
                        "Invalid product or quantity in order."
                    );
                }

                const result = await Product.updateOne(
                    { _id: productId },
                    {
                        $inc: {
                            stock: quantity
                        }
                    }
                );

                if (result.matchedCount === 0) {
                    throw new Error(
                        `Product ${productId} not found.`
                    );
                }

                restoredItems.push({
                    productId,
                    quantity
                });
            }
        }

        // UPDATE STATUS
        order.status = status;

        // UPDATE TRACKING HISTORY
        order.statusHistory.push({
            status,
            note: `Order status changed from ${previousStatus} to ${status}`,
            updatedAt: new Date()
        });

        await order.save();

        res.status(200).json({
            message:
                status === "Cancelled"
                    ? "Order cancelled and stock restored successfully!"
                    : "Order status and tracking history updated successfully!",
            order
        });

    } catch (error) {

        // ROLLBACK RESTORED STOCK IF UPDATE FAILS
        for (const item of restoredItems.reverse()) {
            try {
                await Product.updateOne(
                    { _id: item.productId },
                    {
                        $inc: {
                            stock: -item.quantity
                        }
                    }
                );

            } catch (rollbackError) {
                console.error(
                    "Stock rollback error:",
                    rollbackError.message
                );
            }
        }

        console.error("Update Order Error:", error.message);

        res.status(500).json({
            message:
                error.message ||
                "Unable to update order status."
        });
    }
};


module.exports = {
    getDashboardStats,
    getSalesAnalytics,
    getAllOrders,
    updateOrderStatus
};
