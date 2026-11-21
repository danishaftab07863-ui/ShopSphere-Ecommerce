
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import "./Checkout.css";

function Checkout() {
    const navigate = useNavigate();

    const {
        cartItems,
        totalItems,
        totalPrice,
        clearCart
    } = useCart();

    const [form, setForm] = useState({
        fullName: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        pincode: ""
    });

    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [finalAmount, setFinalAmount] = useState(totalPrice);

    const [couponLoading, setCouponLoading] = useState(false);
    const [couponMessage, setCouponMessage] = useState("");
    const [couponError, setCouponError] = useState("");

    const [orderId, setOrderId] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState("Pending");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const token = localStorage.getItem("token");

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    // COUPON INPUT CHANGE
    const handleCouponChange = (e) => {
        setCouponCode(e.target.value.toUpperCase());

        setAppliedCoupon(null);
        setDiscountAmount(0);
        setFinalAmount(totalPrice);

        setCouponMessage("");
        setCouponError("");
    };

    // APPLY COUPON
    const handleApplyCoupon = async () => {
        setCouponError("");
        setCouponMessage("");

        if (!couponCode.trim()) {
            setCouponError("Please enter a coupon code.");
            return;
        }

        if (!token) {
            navigate("/login");
            return;
        }

        try {
            setCouponLoading(true);

            const response = await api.post(
                "/coupons/validate",
                {
                    code: couponCode.trim(),
                    orderAmount: totalPrice
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = response.data;

            setAppliedCoupon({
                code: data.code || data.coupon?.code || couponCode.trim(),
                discountPercentage:
                    data.discountPercentage ||
                    data.coupon?.discountPercentage
            });

            setDiscountAmount(Number(data.discountAmount));
            setFinalAmount(Number(data.finalAmount));

            setCouponMessage(
                data.message || "Coupon applied successfully!"
            );

        } catch (err) {
            setAppliedCoupon(null);
            setDiscountAmount(0);
            setFinalAmount(totalPrice);

            setCouponError(
                err.response?.data?.message ||
                "Invalid coupon code."
            );
        } finally {
            setCouponLoading(false);
        }
    };

    // REMOVE COUPON
    const handleRemoveCoupon = () => {
        setCouponCode("");
        setAppliedCoupon(null);
        setDiscountAmount(0);
        setFinalAmount(totalPrice);

        setCouponMessage("");
        setCouponError("");
    };

    // CREATE ORDER
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        if (cartItems.length === 0) {
            setError("Your cart is empty.");
            return;
        }

        if (!token) {
            navigate("/login");
            return;
        }

        try {
            setLoading(true);

            const response = await api.post(
                "/orders",
                {
                    items: cartItems.map((item) => ({
                        product: item._id,
                        quantity: item.quantity
                    })),

                    shippingAddress: form,

                    couponCode: appliedCoupon?.code || null
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const createdOrder =
                response.data.order || response.data;

            if (!createdOrder?._id) {
                throw new Error("Order creation failed.");
            }

            // SAVE ACTUAL BACKEND ORDER DETAILS
            setOrderId(createdOrder._id);

            setPaymentStatus(createdOrder.paymentStatus || "Pending");

            // IMPORTANT: Use backend-calculated amounts
            setFinalAmount(Number(createdOrder.totalAmount));

            setDiscountAmount(
                Number(createdOrder.discountAmount || 0)
            );

            if (createdOrder.couponCode) {
                setAppliedCoupon({
                    code: createdOrder.couponCode,
                    discountPercentage:
                        Number(createdOrder.discountPercentage || 0)
                });
            } else {
                setAppliedCoupon(null);
                setDiscountAmount(0);
            }

            setMessage(
                "Order created successfully! Complete your demo payment."
            );

        } catch (err) {
            setError(
                err.response?.data?.message ||
                err.message ||
                "Unable to place order."
            );
        } finally {
            setLoading(false);
        }
    };

    // PROCESS DEMO PAYMENT
    const handleDemoPayment = async (result) => {
        const currentToken = localStorage.getItem("token");

        if (!currentToken || !orderId) {
            navigate("/login");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setMessage("Processing demo payment...");

            const response = await api.post(
                `/orders/${orderId}/demo-payment`,
                { result },
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`
                    }
                }
            );

            const updatedStatus = response.data.paymentStatus;

            setPaymentStatus(updatedStatus);

            if (updatedStatus === "Paid") {
                clearCart();

                setMessage(
                    "Demo payment successful! Payment Status: PAID"
                );
            } else {
                setMessage(
                    "Demo payment failed! Payment Status: FAILED. Your cart is still saved."
                );
            }

        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to process demo payment."
            );

            setMessage("");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkout-page">
            <h1>Checkout</h1>

            <div className="checkout-container">

                {!orderId ? (
                    <form
                        className="checkout-form"
                        onSubmit={handleSubmit}
                    >
                        <h2>Delivery Details</h2>

                        <input
                            type="text"
                            name="fullName"
                            placeholder="Full Name"
                            value={form.fullName}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="tel"
                            name="phone"
                            placeholder="Phone Number"
                            value={form.phone}
                            onChange={handleChange}
                            required
                        />

                        <textarea
                            name="address"
                            placeholder="Full Address"
                            value={form.address}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="text"
                            name="city"
                            placeholder="City"
                            value={form.city}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="text"
                            name="state"
                            placeholder="State"
                            value={form.state}
                            onChange={handleChange}
                            required
                        />

                        <input
                            type="text"
                            name="pincode"
                            placeholder="PIN Code"
                            value={form.pincode}
                            onChange={handleChange}
                            required
                        />

                        {/* COUPON SECTION */}
                        <div className="checkout-coupon">
                            <h2>🎟️ Have a Coupon Code?</h2>

                            <div className="coupon-input-group">
                                <input
                                    type="text"
                                    placeholder="Enter coupon code"
                                    value={couponCode}
                                    onChange={handleCouponChange}
                                    disabled={!!appliedCoupon}
                                />

                                {!appliedCoupon ? (
                                    <button
                                        type="button"
                                        onClick={handleApplyCoupon}
                                        disabled={couponLoading}
                                    >
                                        {couponLoading
                                            ? "Applying..."
                                            : "Apply"}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="remove-coupon-btn"
                                        onClick={handleRemoveCoupon}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>

                            {couponError && (
                                <p className="coupon-error">
                                    {couponError}
                                </p>
                            )}

                            {couponMessage && (
                                <p className="coupon-success">
                                    {couponMessage}
                                </p>
                            )}
                        </div>

                        {error && (
                            <p className="checkout-error">
                                {error}
                            </p>
                        )}

                        {message && (
                            <p className="checkout-success">
                                {message}
                            </p>
                        )}

                        <button type="submit" disabled={loading}>
                            {loading
                                ? "Creating Order..."
                                : "Continue to Demo Payment"}
                        </button>
                    </form>
                ) : (
                    <div className="demo-payment">
                        <h2>Demo Payment</h2>

                        <div className="demo-payment-notice">
                            <strong>Educational Simulation Only</strong>

                            <p>
                                This is a simulated test payment.
                                No real money will be charged or transferred.
                            </p>
                        </div>

                        <h3>Order ID: {orderId}</h3>

                        <h3>
                            Amount: ₹{Number(finalAmount).toFixed(2)}
                        </h3>

                        <p>
                            Payment Status: <strong>{paymentStatus}</strong>
                        </p>

                        {paymentStatus === "Pending" && (
                            <>
                                <p>Select a test payment result:</p>

                                <div className="demo-payment-buttons">
                                    <button
                                        type="button"
                                        className="demo-success-btn"
                                        onClick={() => handleDemoPayment("success")}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "Processing..."
                                            : "Test Success"}
                                    </button>

                                    <button
                                        type="button"
                                        className="demo-failure-btn"
                                        onClick={() => handleDemoPayment("failure")}
                                        disabled={loading}
                                    >
                                        {loading
                                            ? "Processing..."
                                            : "Test Failure"}
                                    </button>
                                </div>
                            </>
                        )}

                        {paymentStatus === "Paid" && (
                            <p className="checkout-success">
                                Payment completed successfully!
                            </p>
                        )}

                        {paymentStatus === "Failed" && (
                            <p className="checkout-error">
                                Payment failed. Your cart is still saved.
                            </p>
                        )}

                        <small>
                            This is only a demo. No real transaction takes place.
                        </small>

                        {paymentStatus !== "Pending" && (
                            <button
                                type="button"
                                onClick={() => navigate("/my-orders")}
                                disabled={loading}
                            >
                                View My Orders
                            </button>
                        )}
                    </div>
                )}

                <div className="checkout-summary">
                    <h2>Order Summary</h2>

                    {cartItems.map((item) => (
                        <div
                            className="checkout-item"
                            key={item._id}
                        >
                            <span>
                                {item.name} × {item.quantity}
                            </span>

                            <span>
                                ₹{item.price * item.quantity}
                            </span>
                        </div>
                    ))}

                    <hr />

                    <p>Total Items: {totalItems}</p>

                    <p>
                        Subtotal: ₹{Number(totalPrice).toFixed(2)}
                    </p>

                    {appliedCoupon && (
                        <>
                            <p className="coupon-discount">
                                Coupon ({appliedCoupon.code}):
                                {" "} -₹{Number(discountAmount).toFixed(2)}
                            </p>

                            <p className="coupon-discount">
                                Discount: {appliedCoupon.discountPercentage}%
                            </p>
                        </>
                    )}

                    <h3>
                        Total: ₹{Number(finalAmount).toFixed(2)}
                    </h3>

                    <small>
                        Demo payment only. No real transaction.
                    </small>
                </div>
            </div>

            {error && orderId && (
                <p className="checkout-error">{error}</p>
            )}

            {message && orderId && (
                <p className="checkout-success">{message}</p>
            )}
        </div>
    );
}

export default Checkout;
