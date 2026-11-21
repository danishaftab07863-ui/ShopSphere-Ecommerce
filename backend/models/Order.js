
const mongoose = require("mongoose");

const orderStatusHistorySchema = new mongoose.Schema(
    {
        status: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Shipped",
                "Delivered",
                "Cancelled"
            ],
            required: true
        },

        note: {
            type: String,
            default: ""
        },

        updatedAt: {
            type: Date,
            default: Date.now
        }
    },
    { _id: false }
);


const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        items: [
            {
                product: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },

                name: {
                    type: String,
                    required: true
                },

                price: {
                    type: Number,
                    required: true,
                    min: 0
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ],

        shippingAddress: {
            fullName: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true }
        },

        // ORIGINAL AMOUNT BEFORE DISCOUNT
        subtotalAmount: {
            type: Number,
            required: true,
            min: 0,
            default: function () {
                return (this.items || []).reduce(
                    (total, item) => {
                        return total +
                            (Number(item.price) * Number(item.quantity));
                    },
                    0
                );
            }
        },

        // COUPON DETAILS
        couponCode: {
            type: String,
            default: null,
            uppercase: true,
            trim: true
        },

        discountPercentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },

        discountAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        // FINAL AMOUNT AFTER DISCOUNT
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },

        // ORDER STATUS
        status: {
            type: String,
            enum: [
                "Pending",
                "Confirmed",
                "Shipped",
                "Delivered",
                "Cancelled"
            ],
            default: "Pending"
        },

        // ORDER TRACKING HISTORY
        statusHistory: {
            type: [orderStatusHistorySchema],
            default: function () {
                return [
                    {
                        status: this.status || "Pending",
                        note: "Order placed"
                    }
                ];
            }
        },

        // PAYMENT STATUS
        paymentStatus: {
            type: String,
            enum: ["Pending", "Paid", "Failed"],
            default: "Pending"
        },

        paymentMethod: {
            type: String,
            enum: ["Not Selected", "Demo Payment"],
            default: "Not Selected"
        }
    },
    {
        timestamps: true
    }
);


module.exports = mongoose.model("Order", orderSchema);
