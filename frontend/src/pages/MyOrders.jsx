
import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import api from "../services/api";

import "./MyOrders.css";

// ORDER TRACKING STEPS
const trackingSteps = [
    "Pending",
    "Confirmed",
    "Shipped",
    "Delivered"
];

// CURRENCY FORMAT
const formatPrice = (amount) =>
    `Rs. ${Number(amount || 0).toFixed(2)}`;

// DOWNLOAD INVOICE PDF
const downloadInvoice = (order) => {
    try {
        const doc = new jsPDF();

        const pageWidth = doc.internal.pageSize.getWidth();
        const address = order.shippingAddress || {};

        const subtotalAmount = Number(
            order.subtotalAmount ??
            order.items?.reduce(
                (sum, item) =>
                    sum + Number(item.price) * Number(item.quantity),
                0
            ) ??
            order.totalAmount
        );

        const discountAmount = Number(order.discountAmount || 0);
        const discountPercentage = Number(order.discountPercentage || 0);
        const totalAmount = Number(order.totalAmount || 0);

        // HEADER
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");

        doc.text(
            "MY E-COMMERCE STORE",
            pageWidth / 2,
            20,
            { align: "center" }
        );

        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");

        doc.text(
            "ORDER INVOICE",
            pageWidth / 2,
            28,
            { align: "center" }
        );

        doc.line(14, 34, pageWidth - 14, 34);

        // ORDER DETAILS
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");

        doc.text("Invoice Details", 14, 44);

        doc.setFont("helvetica", "normal");

        doc.text(`Order ID: ${order._id}`, 14, 52);

        doc.text(
            `Order Date: ${new Date(order.createdAt).toLocaleDateString()}`,
            14,
            59
        );

        doc.text(
            `Order Status: ${order.status || "Pending"}`,
            14,
            66
        );

        doc.text(
            `Payment Status: ${order.paymentStatus || "Pending"}`,
            14,
            73
        );

        doc.text(
            `Payment Method: ${order.paymentMethod || "Not Selected"}`,
            14,
            80
        );

        // SHIPPING ADDRESS
        doc.setFont("helvetica", "bold");
        doc.text("Customer & Shipping Details", 14, 93);

        doc.setFont("helvetica", "normal");

        doc.text(`Name: ${address.fullName || ""}`, 14, 101);
        doc.text(`Phone: ${address.phone || ""}`, 14, 108);

        const addressLines = doc.splitTextToSize(
            `Address: ${address.address || ""}, ${address.city || ""}, ${address.state || ""} - ${address.pincode || ""}`,
            pageWidth - 28
        );

        doc.text(addressLines, 14, 115);

        // PRODUCTS TABLE
        const tableStartY =
            125 + Math.max(0, addressLines.length - 1) * 6;

        const rows = (order.items || []).map((item, index) => [
            index + 1,
            item.name,
            item.quantity,
            formatPrice(item.price),
            formatPrice(Number(item.price) * Number(item.quantity))
        ]);

        autoTable(doc, {
            startY: tableStartY,

            head: [[
                "S.No",
                "Product",
                "Qty",
                "Price",
                "Subtotal"
            ]],

            body: rows,

            theme: "grid",

            styles: {
                fontSize: 9,
                cellPadding: 3
            },

            headStyles: {
                fillColor: [37, 99, 235]
            },

            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: "auto" },
                2: { cellWidth: 18 },
                3: { cellWidth: 30 },
                4: { cellWidth: 32 }
            }
        });

        // PRICE SUMMARY
        let finalY = doc.lastAutoTable.finalY + 12;

        if (finalY > 245) {
            doc.addPage();
            finalY = 25;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");

        doc.text(
            `Subtotal: ${formatPrice(subtotalAmount)}`,
            pageWidth - 14,
            finalY,
            { align: "right" }
        );

        finalY += 8;

        if (order.couponCode && discountAmount > 0) {
            doc.text(
                `Coupon Code: ${order.couponCode}`,
                pageWidth - 14,
                finalY,
                { align: "right" }
            );

            finalY += 8;

            doc.text(
                `Discount (${discountPercentage}%): -${formatPrice(discountAmount)}`,
                pageWidth - 14,
                finalY,
                { align: "right" }
            );

            finalY += 10;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);

        doc.text(
            `Final Amount: ${formatPrice(totalAmount)}`,
            pageWidth - 14,
            finalY,
            { align: "right" }
        );

        // FOOTER
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);

        doc.text(
            "Thank you for shopping with us!",
            pageWidth / 2,
            finalY + 18,
            { align: "center" }
        );

        // SAVE PDF
        doc.save(`Invoice-${order._id.slice(-8)}.pdf`);

    } catch (error) {
        console.error("Invoice Download Error:", error);
        alert("Unable to generate invoice. Please try again.");
    }
};


// ORDER TRACKING COMPONENT
function OrderTracking({ order }) {

    const currentStatus = order.status || "Pending";
    const history = order.statusHistory || [];
    const isCancelled = currentStatus === "Cancelled";
    const currentStep = trackingSteps.indexOf(currentStatus);

    return (
        <div className="order-tracking">

            <h4>Order Tracking</h4>

            {isCancelled ? (
                <div className="tracking-cancelled">
                    <strong>Order Cancelled</strong>
                    <p>This order has been cancelled.</p>
                </div>
            ) : (
                <div className="tracking-timeline">

                    {trackingSteps.map((step, index) => {

                        const completed = currentStep >= index;

                        const historyEntry = history.find(
                            (entry) => entry.status === step
                        );

                        return (
                            <div
                                className={`tracking-step ${completed ? "completed" : ""}`}
                                key={step}
                            >

                                <div className="tracking-indicator">
                                    <span>
                                        {completed ? "✓" : index + 1}
                                    </span>
                                </div>

                                <div className="tracking-step-content">

                                    <strong>{step}</strong>

                                    {historyEntry && (
                                        <>
                                            <p>{historyEntry.note}</p>

                                            <small>
                                                {new Date(
                                                    historyEntry.updatedAt
                                                ).toLocaleString()}
                                            </small>
                                        </>
                                    )}

                                </div>

                            </div>
                        );
                    })}

                </div>
            )}

            {history.length > 0 && (
                <div className="tracking-history">

                    <h5>Tracking Updates</h5>

                    {[...history].reverse().map((entry, index) => (
                        <div
                            className="tracking-history-item"
                            key={`${entry.status}-${entry.updatedAt}-${index}`}
                        >
                            <strong>{entry.status}</strong>

                            <p>
                                {entry.note || "Order status updated"}
                            </p>

                            <small>
                                {new Date(
                                    entry.updatedAt
                                ).toLocaleString()}
                            </small>
                        </div>
                    ))}

                </div>
            )}

        </div>
    );
}


// MY ORDERS COMPONENT
function MyOrders() {

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [deletingId, setDeletingId] = useState("");

    // FETCH ORDERS
    const fetchOrders = async () => {

        const token = localStorage.getItem("token");

        if (!token) {
            setError("Please login to view your orders.");
            setLoading(false);
            return;
        }

        try {

            const response = await api.get("/orders/my-orders", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setOrders(response.data.orders || []);

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Unable to load your orders."
            );

        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    // DELETE ORDER
    const handleDelete = async (orderId) => {

        const confirmed = window.confirm(
            "Are you sure you want to delete this order?"
        );

        if (!confirmed) return;

        const token = localStorage.getItem("token");

        try {

            setDeletingId(orderId);
            setError("");

            const response = await api.delete(
                `/orders/${orderId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setOrders((previousOrders) =>
                previousOrders.filter(
                    (order) => order._id !== orderId
                )
            );

            alert(
                response.data.message ||
                "Order deleted successfully!"
            );

        } catch (err) {

            setError(
                err.response?.data?.message ||
                "Unable to delete order."
            );

        } finally {
            setDeletingId("");
        }
    };

    // LOADING
    if (loading) {
        return (
            <h2 className="orders-loading">
                Loading orders...
            </h2>
        );
    }

    return (

        <div className="my-orders-page">

            <h1>My Orders</h1>

            {error && (
                <p className="orders-error">{error}</p>
            )}

            {!error && orders.length === 0 && (
                <div className="no-orders">
                    <h2>No Orders Found</h2>
                    <p>You haven't placed any orders yet.</p>
                </div>
            )}

            <div className="orders-list">

                {orders.map((order) => {

                    const subtotalAmount = Number(
                        order.subtotalAmount ??
                        order.items?.reduce(
                            (sum, item) =>
                                sum +
                                Number(item.price) *
                                Number(item.quantity),
                            0
                        ) ??
                        order.totalAmount
                    );

                    const discountAmount = Number(
                        order.discountAmount || 0
                    );

                    const discountPercentage = Number(
                        order.discountPercentage || 0
                    );

                    const totalAmount = Number(
                        order.totalAmount || 0
                    );

                    return (

                        <div className="order-card" key={order._id}>

                            {/* ORDER HEADER */}
                            <div className="order-header">

                                <h3>
                                    Order #{order._id.slice(-8)}
                                </h3>

                                <span className={`order-status ${(order.status || "Pending").toLowerCase()}`}>
                                    {order.status || "Pending"}
                                </span>

                            </div>

                            <p>
                                Order Date:{" "}
                                {new Date(order.createdAt).toLocaleDateString()}
                            </p>

                            {/* ORDER TRACKING */}
                            <OrderTracking order={order} />

                            {/* PAYMENT DETAILS */}
                            <div className="payment-details">

                                <h4>Payment Information</h4>

                                <p>
                                    Payment Status:{" "}
                                    <strong className={`payment-status ${(order.paymentStatus || "Pending").toLowerCase()}`}>
                                        {order.paymentStatus || "Pending"}
                                    </strong>
                                </p>

                                <p>
                                    Payment Method:{" "}
                                    <strong>
                                        {order.paymentMethod || "Not Selected"}
                                    </strong>
                                </p>

                            </div>

                            {/* ORDER PRODUCTS */}
                            <div className="order-products">

                                {order.items.map((item, index) => (

                                    <div
                                        className="order-product"
                                        key={`${item.product}-${index}`}
                                    >

                                        <span>
                                            {item.name} × {item.quantity}
                                        </span>

                                        <span>
                                            ₹{(
                                                Number(item.price) *
                                                Number(item.quantity)
                                            ).toFixed(2)}
                                        </span>

                                    </div>

                                ))}

                            </div>

                            {/* COUPON & PRICE SUMMARY */}
                            <div className="order-price-summary">

                                <h4>Price Summary</h4>

                                <div className="order-price-row">
                                    <span>Subtotal:</span>

                                    <strong>
                                        ₹{subtotalAmount.toFixed(2)}
                                    </strong>
                                </div>

                                {order.couponCode && discountAmount > 0 && (
                                    <>
                                        <div className="order-price-row">
                                            <span>Coupon Applied:</span>

                                            <strong className="order-coupon-code">
                                                {order.couponCode}
                                            </strong>
                                        </div>

                                        <div className="order-price-row order-discount-row">
                                            <span>
                                                Discount ({discountPercentage}%):
                                            </span>

                                            <strong>
                                                -₹{discountAmount.toFixed(2)}
                                            </strong>
                                        </div>
                                    </>
                                )}

                                <div className="order-total">
                                    <strong>
                                        Final Amount: ₹{totalAmount.toFixed(2)}
                                    </strong>
                                </div>

                            </div>

                            {/* DELIVERY ADDRESS */}
                            <div className="order-address">

                                <h4>Delivery Address</h4>

                                <p>
                                    {order.shippingAddress?.fullName}
                                </p>

                                <p>
                                    {order.shippingAddress?.address}
                                </p>

                                <p>
                                    {order.shippingAddress?.city},{" "}
                                    {order.shippingAddress?.state} -{" "}
                                    {order.shippingAddress?.pincode}
                                </p>

                            </div>

                            {/* DOWNLOAD INVOICE BUTTON */}
                            <button
                                className="download-invoice-btn"
                                onClick={() => downloadInvoice(order)}
                            >
                                📄 Download Invoice PDF
                            </button>

                            {/* DELETE ORDER BUTTON */}
                            {order.status === "Pending" && (
                                <button
                                    className="delete-order-btn"
                                    onClick={() => handleDelete(order._id)}
                                    disabled={deletingId === order._id}
                                >
                                    {deletingId === order._id
                                        ? "Deleting..."
                                        : "🗑 Delete Order"}
                                </button>
                            )}

                        </div>
                    );
                })}

            </div>

        </div>
    );
}

export default MyOrders;
