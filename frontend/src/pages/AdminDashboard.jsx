
import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Legend
} from "recharts";

import api from "../services/api";
import "./AdminDashboard.css";

const emptyProductForm = {
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    stock: "0"
};

const chartColors = [
    "#2563eb",
    "#16a34a",
    "#f59e0b",
    "#9333ea",
    "#dc2626"
];

function AdminDashboard() {
    const productFormRef = useRef(null);
    const couponFormRef = useRef(null);

    // DASHBOARD STATISTICS
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalProducts: 0,
        totalSales: 0,
        paidOrders: 0
    });

    // ANALYTICS DATA
    const [analytics, setAnalytics] = useState({
        monthlySales: [],
        topProducts: [],
        orderStatus: []
    });

    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);

    // INVENTORY ALERTS: low stock (1-5) and out of stock (0)
    const lowStockProducts = products.filter((product) => {
        const stock = Number(product.stock ?? 0);
        return stock > 0 && stock <= 5;
    });

    const outOfStockProducts = products.filter(
        (product) => Number(product.stock ?? 0) <= 0
    );

    const [coupons, setCoupons] = useState([]);

    const [couponForm, setCouponForm] = useState({
        code: "",
        discountPercentage: "",
        minOrderAmount: "0",
        expiryDate: "",
        usageLimit: "100"
    });
    const [editingCouponId, setEditingCouponId] = useState(null);
    const [couponsLoading, setCouponsLoading] = useState(true);
    const [savingCoupon, setSavingCoupon] = useState(false);

    const [loading, setLoading] = useState(true);
    const [productsLoading, setProductsLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);

    const [message, setMessage] = useState("");
    const [errorMessage, setErrorMessage] = useState("");

    const [productForm, setProductForm] = useState(emptyProductForm);
    const [editingProductId, setEditingProductId] = useState(null);
    const [savingProduct, setSavingProduct] = useState(false);

    const token = localStorage.getItem("token");

    const headers = {
        Authorization: `Bearer ${token}`
    };

    // FETCH DASHBOARD, ORDERS AND ANALYTICS
    const fetchDashboardData = async (showLoader = true) => {
        try {
            // Keep the dashboard mounted during background refreshes.
            // This prevents the page from jumping to the top after an order update.
            if (showLoader) {
                setLoading(true);
                setAnalyticsLoading(true);
            }

            const [
                statsResponse,
                ordersResponse,
                analyticsResponse
            ] = await Promise.all([
                api.get("/admin/stats", { headers }),
                api.get("/admin/orders", { headers }),
                api.get("/admin/analytics", { headers })
            ]);

            setStats(statsResponse.data);

            setOrders(
                ordersResponse.data.orders || []
            );

            setAnalytics({
                monthlySales:
                    analyticsResponse.data.monthlySales || [],

                topProducts:
                    analyticsResponse.data.topProducts || [],

                orderStatus:
                    analyticsResponse.data.orderStatus || []
            });

        } catch (error) {
            console.error("Dashboard Error:", error);

            setErrorMessage(
                error.response?.data?.message ||
                "Unable to load dashboard data."
            );
        } finally {
            if (showLoader) {
                setLoading(false);
                setAnalyticsLoading(false);
            }
        }
    };

    // FETCH ALL PRODUCTS
    const fetchProducts = async () => {
        try {
            setProductsLoading(true);

            const response = await api.get("/products");

            setProducts(response.data.products || []);

        } catch (error) {
            console.error("Products Error:", error);

            setErrorMessage(
                error.response?.data?.message ||
                "Unable to load products."
            );
        } finally {
            setProductsLoading(false);
        }
    };

    // FETCH ALL COUPONS
    const fetchCoupons = async () => {
        try {
            setCouponsLoading(true);

            const response = await api.get("/coupons", { headers });

            setCoupons(response.data.coupons || response.data || []);
        } catch (error) {
            console.error("Coupons Error:", error);

            setErrorMessage(
                error.response?.data?.message ||
                "Unable to load coupons."
            );
        } finally {
            setCouponsLoading(false);
        }
    };

    // INITIAL DATA LOAD
    useEffect(() => {
        fetchDashboardData();
        fetchProducts();
        fetchCoupons();
    }, []);

    // UPDATE ORDER STATUS
    const handleStatusChange = async (orderId, status) => {
        try {
            setErrorMessage("");
            setMessage("");

            await api.put(
                `/admin/orders/${orderId}/status`,
                { status },
                { headers }
            );

            setMessage("Order status updated successfully!");

            // Refresh data in the background without unmounting the dashboard.
            // Cancelling an order can restore stock, so refresh products as well.
            await Promise.all([fetchDashboardData(false), fetchProducts()]);

        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                "Unable to update order status."
            );
        }
    };

    // HANDLE PRODUCT FORM INPUTS
    const handleProductInput = (e) => {
        const { name, value } = e.target;

        setProductForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    // RESET PRODUCT FORM
    const resetProductForm = () => {
        setProductForm(emptyProductForm);
        setEditingProductId(null);
    };

    // ADD OR UPDATE PRODUCT
    const handleProductSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setErrorMessage("");

        const price = Number(productForm.price);
        const stock = Number(productForm.stock);

        if (
            !productForm.name.trim() ||
            !productForm.description.trim() ||
            !productForm.category.trim() ||
            productForm.price === ""
        ) {
            setErrorMessage(
                "Please fill all required product fields."
            );
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            setErrorMessage(
                "Price must be a valid number greater than or equal to 0."
            );
            return;
        }

        if (!Number.isInteger(stock) || stock < 0) {
            setErrorMessage(
                "Stock must be a whole number greater than or equal to 0."
            );
            return;
        }

        const productData = {
            name: productForm.name.trim(),
            description: productForm.description.trim(),
            price,
            category: productForm.category.trim(),
            image: productForm.image.trim(),
            stock
        };

        try {
            setSavingProduct(true);

            if (editingProductId) {
                await api.put(
                    `/products/${editingProductId}`,
                    productData,
                    { headers }
                );

                setMessage("Product updated successfully!");

            } else {
                await api.post(
                    "/products",
                    productData,
                    { headers }
                );

                setMessage("Product added successfully!");
            }

            resetProductForm();

            await Promise.all([
                fetchProducts(),
                fetchDashboardData()
            ]);

        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                "Unable to save product."
            );
        } finally {
            setSavingProduct(false);
        }
    };

    // LOAD PRODUCT DETAILS FOR EDITING
    const handleEditProduct = (product) => {
        setEditingProductId(product._id);

        setProductForm({
            name: product.name || "",
            description: product.description || "",
            price: String(product.price ?? ""),
            category: product.category || "",
            image: product.image || "",
            stock: String(product.stock ?? 0)
        });

        setMessage("");
        setErrorMessage("");

        // Scroll directly to the product form when editing.
        requestAnimationFrame(() => {
            productFormRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    };

    // DELETE PRODUCT
    const handleDeleteProduct = async (productId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this product?"
        );

        if (!confirmed) return;

        try {
            setMessage("");
            setErrorMessage("");

            await api.delete(
                `/products/${productId}`,
                { headers }
            );

            if (editingProductId === productId) {
                resetProductForm();
            }

            setMessage("Product deleted successfully!");

            await Promise.all([
                fetchProducts(),
                fetchDashboardData()
            ]);

        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                "Unable to delete product."
            );
        }
    };

    // HANDLE COUPON FORM INPUTS
    const handleCouponInput = (e) => {
        const { name, value } = e.target;

        setCouponForm((previous) => ({
            ...previous,
            [name]: value
        }));
    };

    // RESET COUPON FORM
    const resetCouponForm = () => {
        setCouponForm({
            code: "",
            discountPercentage: "",
            minOrderAmount: "0",
            expiryDate: "",
            usageLimit: "100"
        });
        setEditingCouponId(null);
    };

    // CREATE OR UPDATE COUPON
    const handleCouponSubmit = async (e) => {
        e.preventDefault();

        setMessage("");
        setErrorMessage("");

        const discountPercentage = Number(couponForm.discountPercentage);
        const minOrderAmount = Number(couponForm.minOrderAmount);
        const usageLimit = Number(couponForm.usageLimit);

        if (
            !editingCouponId &&
            !couponForm.code.trim()
        ) {
            setErrorMessage("Please enter a coupon code.");
            return;
        }

        if (
            !Number.isFinite(discountPercentage) ||
            discountPercentage < 1 ||
            discountPercentage > 100
        ) {
            setErrorMessage("Discount must be between 1 and 100.");
            return;
        }

        if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
            setErrorMessage("Minimum order amount must be 0 or greater.");
            return;
        }

        if (!Number.isInteger(usageLimit) || usageLimit < 1) {
            setErrorMessage("Usage limit must be a whole number greater than 0.");
            return;
        }

        if (!couponForm.expiryDate) {
            setErrorMessage("Please select an expiry date.");
            return;
        }

        const expiryDate = new Date(
            `${couponForm.expiryDate}T23:59:59`
        );

        if (expiryDate <= new Date()) {
            setErrorMessage("Expiry date must be in the future.");
            return;
        }

        const couponData = {
            discountPercentage,
            minOrderAmount,
            expiryDate: expiryDate.toISOString(),
            usageLimit
        };

        try {
            setSavingCoupon(true);

            if (editingCouponId) {
                await api.put(
                    `/coupons/${editingCouponId}`,
                    couponData,
                    { headers }
                );

                setMessage("Coupon updated successfully!");
            } else {
                await api.post(
                    "/coupons",
                    {
                        ...couponData,
                        code: couponForm.code.trim().toUpperCase()
                    },
                    { headers }
                );

                setMessage("Coupon created successfully!");
            }

            resetCouponForm();
            await fetchCoupons();
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                "Unable to save coupon."
            );
        } finally {
            setSavingCoupon(false);
        }
    };

    // LOAD COUPON DETAILS FOR EDITING
    const handleEditCoupon = (coupon) => {
        setEditingCouponId(coupon._id);

        setCouponForm({
            code: coupon.code || "",
            discountPercentage: String(coupon.discountPercentage ?? ""),
            minOrderAmount: String(coupon.minOrderAmount ?? 0),
            expiryDate: coupon.expiryDate
                ? new Date(coupon.expiryDate).toISOString().slice(0, 10)
                : "",
            usageLimit: String(coupon.usageLimit ?? 100)
        });

        setMessage("");
        setErrorMessage("");

        // Scroll directly to the coupon form when editing.
        requestAnimationFrame(() => {
            couponFormRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });
    };

    // TOGGLE COUPON ACTIVE STATUS
    const handleToggleCoupon = async (coupon) => {
        try {
            setMessage("");
            setErrorMessage("");

            await api.put(
                `/coupons/${coupon._id}`,
                { isActive: !coupon.isActive },
                { headers }
            );

            setMessage(
                `Coupon ${coupon.isActive ? "deactivated" : "activated"} successfully!`
            );

            await fetchCoupons();
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                "Unable to update coupon status."
            );
        }
    };

    // DELETE COUPON
    const handleDeleteCoupon = async (couponId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this coupon?"
        );

        if (!confirmed) return;

        try {
            setMessage("");
            setErrorMessage("");

            await api.delete(`/coupons/${couponId}`, { headers });

            if (editingCouponId === couponId) {
                resetCouponForm();
            }

            setMessage("Coupon deleted successfully!");
            await fetchCoupons();
        } catch (error) {
            setErrorMessage(
                error.response?.data?.message ||
                "Unable to delete coupon."
            );
        }
    };

    // INITIAL LOADING
    if (loading) {
        return (
            <div className="admin-container">
                Loading dashboard...
            </div>
        );
    }

    return (
        <div className="admin-container">

            {/* HEADER */}
            <div className="admin-header">

                <div>
                    <h1>Admin Dashboard</h1>
                    <p>Manage your store, products and orders</p>
                </div>

                <Link to="/" className="back-home">
                    Back to Store
                </Link>

            </div>

            {/* SUCCESS MESSAGE */}
            {message && (
                <div className="admin-message">
                    {message}
                </div>
            )}

            {/* ERROR MESSAGE */}
            {errorMessage && (
                <div className="admin-error">
                    {errorMessage}
                </div>
            )}

            {/* DASHBOARD STATISTICS */}
            <div className="stats-grid">

                <div className="stat-card">
                    <h3>Total Orders</h3>
                    <h2>{stats.totalOrders}</h2>
                </div>

                <div className="stat-card">
                    <h3>Total Products</h3>
                    <h2>{stats.totalProducts}</h2>
                </div>

                <div className="stat-card">
                    <h3>Paid Revenue</h3>
                    <h2>
                        ₹{Number(stats.totalSales || 0)
                            .toLocaleString("en-IN")}
                    </h2>
                </div>

                <div className="stat-card">
                    <h3>Paid Orders</h3>
                    <h2>{stats.paidOrders || 0}</h2>
                </div>

            </div>

            {/* INVENTORY / LOW STOCK ALERTS */}
            <section className="stock-alert-section">
                <div className="stock-alert-heading">
                    <div>
                        <h2>Inventory Alerts</h2>
                        <p>Keep track of products that need restocking.</p>
                    </div>
                </div>

                <div className="stock-alert-summary">
                    <div className="stock-alert-card low-stock-summary">
                        <span className="stock-alert-label">Low Stock Products</span>
                        <strong>{lowStockProducts.length}</strong>
                        <small>Products with 1 to 5 items left</small>
                    </div>

                    <div className="stock-alert-card out-stock-summary">
                        <span className="stock-alert-label">Out of Stock Products</span>
                        <strong>{outOfStockProducts.length}</strong>
                        <small>Products that are currently unavailable</small>
                    </div>
                </div>

                <div className="stock-alert-list">
                    <h3>Low Stock Products</h3>
                    {productsLoading ? (
                        <p>Loading inventory...</p>
                    ) : lowStockProducts.length === 0 ? (
                        <p className="stock-success">All products have sufficient stock.</p>
                    ) : (
                        <div className="table-wrapper">
                            <table className="admin-table stock-alert-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Available Stock</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockProducts.map((product) => (
                                        <tr key={product._id}>
                                            <td>{product.name}</td>
                                            <td>{product.category}</td>
                                            <td>₹{Number(product.price || 0).toLocaleString("en-IN")}</td>
                                            <td><span className="low-stock-badge">{product.stock} left</span></td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="edit-product-btn"
                                                    onClick={() => handleEditProduct(product)}
                                                >
                                                    Restock
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="stock-alert-list">
                    <h3>Out of Stock Products</h3>
                    {productsLoading ? (
                        <p>Loading inventory...</p>
                    ) : outOfStockProducts.length === 0 ? (
                        <p className="stock-success">No products are out of stock.</p>
                    ) : (
                        <div className="table-wrapper">
                            <table className="admin-table stock-alert-table">
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Price</th>
                                        <th>Available Stock</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {outOfStockProducts.map((product) => (
                                        <tr key={product._id}>
                                            <td>{product.name}</td>
                                            <td>{product.category}</td>
                                            <td>₹{Number(product.price || 0).toLocaleString("en-IN")}</td>
                                            <td><span className="out-stock-badge">Out of Stock</span></td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="edit-product-btn"
                                                    onClick={() => handleEditProduct(product)}
                                                >
                                                    Restock Product
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            {/* SALES ANALYTICS */}
            <section className="analytics-section">

                <div className="analytics-heading">
                    <div>
                        <h2>Sales Analytics</h2>
                        <p>
                            Understand your store's sales and order performance
                        </p>
                    </div>
                </div>

                {analyticsLoading ? (
                    <p>Loading analytics...</p>
                ) : (
                    <>

                        {/* MONTHLY REVENUE */}
                        <div className="analytics-card monthly-chart-card">

                            <h3>Monthly Revenue</h3>

                            <p className="chart-subtitle">
                                Paid revenue for the last 12 months
                            </p>

                            {analytics.monthlySales.length === 0 ? (
                                <p>No sales data available.</p>
                            ) : (
                                <ResponsiveContainer
                                    width="100%"
                                    height={320}
                                >
                                    <BarChart
                                        data={analytics.monthlySales}
                                    >

                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                        />

                                        <XAxis dataKey="month" />

                                        <YAxis />

                                        <Tooltip
                                            formatter={(value) => [
                                                `₹${Number(value)
                                                    .toLocaleString("en-IN")}`,
                                                "Revenue"
                                            ]}
                                        />

                                        <Bar
                                            dataKey="revenue"
                                            fill="#2563eb"
                                            radius={[6, 6, 0, 0]}
                                        />

                                    </BarChart>
                                </ResponsiveContainer>
                            )}

                        </div>

                        {/* TOP PRODUCTS AND ORDER STATUS */}
                        <div className="analytics-grid">

                            {/* BEST SELLING PRODUCTS */}
                            <div className="analytics-card">

                                <h3>Best-Selling Products</h3>

                                <p className="chart-subtitle">
                                    Top 5 products by quantity sold
                                </p>

                                {analytics.topProducts.length === 0 ? (
                                    <p>
                                        No paid product sales available yet.
                                    </p>
                                ) : (
                                    <div className="analytics-table-wrapper">

                                        <table className="analytics-table">

                                            <thead>
                                                <tr>
                                                    <th>Product</th>
                                                    <th>Quantity Sold</th>
                                                    <th>Revenue</th>
                                                </tr>
                                            </thead>

                                            <tbody>
                                                {analytics.topProducts.map(
                                                    (product, index) => (
                                                        <tr
                                                            key={`${product.name}-${index}`}
                                                        >

                                                            <td>
                                                                {product.name}
                                                            </td>

                                                            <td>
                                                                {product.quantitySold}
                                                            </td>

                                                            <td>
                                                                ₹{Number(
                                                                    product.revenue || 0
                                                                ).toLocaleString("en-IN")}
                                                            </td>

                                                        </tr>
                                                    )
                                                )}
                                            </tbody>

                                        </table>

                                    </div>
                                )}

                            </div>

                            {/* ORDER STATUS BREAKDOWN */}
                            <div className="analytics-card">

                                <h3>Order Status Breakdown</h3>

                                <p className="chart-subtitle">
                                    Current status of all orders
                                </p>

                                {analytics.orderStatus.length === 0 ? (
                                    <p>No order data available.</p>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={280}
                                    >

                                        <PieChart>

                                            <Pie
                                                data={analytics.orderStatus}
                                                dataKey="count"
                                                nameKey="status"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={90}
                                                label
                                            >

                                                {analytics.orderStatus.map(
                                                    (entry, index) => (
                                                        <Cell
                                                            key={entry.status}
                                                            fill={
                                                                chartColors[
                                                                index % chartColors.length
                                                                ]
                                                            }
                                                        />
                                                    )
                                                )}

                                            </Pie>

                                            <Tooltip />
                                            <Legend />

                                        </PieChart>

                                    </ResponsiveContainer>
                                )}

                            </div>

                        </div>

                    </>
                )}

            </section>

            {/* COUPON MANAGEMENT */}
            <section className="coupon-management" ref={couponFormRef}>
                <h2>
                    {editingCouponId ? "Edit Coupon" : "Create New Coupon"}
                </h2>

                <form className="coupon-form" onSubmit={handleCouponSubmit}>
                    <div className="coupon-form-grid">
                        <div className="form-group">
                            <label>Coupon Code *</label>
                            <input
                                type="text"
                                name="code"
                                value={couponForm.code}
                                onChange={handleCouponInput}
                                placeholder="Example: SAVE20"
                                disabled={Boolean(editingCouponId)}
                                required={!editingCouponId}
                            />
                        </div>

                        <div className="form-group">
                            <label>Discount Percentage *</label>
                            <input
                                type="number"
                                name="discountPercentage"
                                value={couponForm.discountPercentage}
                                onChange={handleCouponInput}
                                placeholder="Example: 20"
                                min="1"
                                max="100"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Minimum Order Amount (₹)</label>
                            <input
                                type="number"
                                name="minOrderAmount"
                                value={couponForm.minOrderAmount}
                                onChange={handleCouponInput}
                                min="0"
                                step="0.01"
                            />
                        </div>

                        <div className="form-group">
                            <label>Expiry Date *</label>
                            <input
                                type="date"
                                name="expiryDate"
                                value={couponForm.expiryDate}
                                onChange={handleCouponInput}
                                min={new Date().toISOString().slice(0, 10)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Usage Limit *</label>
                            <input
                                type="number"
                                name="usageLimit"
                                value={couponForm.usageLimit}
                                onChange={handleCouponInput}
                                min="1"
                                step="1"
                                required
                            />
                        </div>
                    </div>

                    <div className="coupon-form-actions">
                        <button
                            type="submit"
                            className="save-coupon-btn"
                            disabled={savingCoupon}
                        >
                            {savingCoupon
                                ? "Saving..."
                                : editingCouponId
                                    ? "Update Coupon"
                                    : "Create Coupon"}
                        </button>

                        {editingCouponId && (
                            <button
                                type="button"
                                className="cancel-coupon-btn"
                                onClick={resetCouponForm}
                            >
                                Cancel Edit
                            </button>
                        )}
                    </div>
                </form>

                <h2>All Coupons ({coupons.length})</h2>

                {couponsLoading ? (
                    <p>Loading coupons...</p>
                ) : coupons.length === 0 ? (
                    <p>No coupons found. Create your first coupon above.</p>
                ) : (
                    <div className="table-wrapper">
                        <table className="admin-table coupon-table">
                            <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Discount</th>
                                    <th>Minimum Order</th>
                                    <th>Expiry Date</th>
                                    <th>Usage</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {coupons.map((coupon) => {
                                    const expired =
                                        new Date(coupon.expiryDate) <= new Date();
                                    const limitReached =
                                        coupon.usedCount >= coupon.usageLimit;

                                    return (
                                        <tr key={coupon._id}>
                                            <td>{coupon.code}</td>
                                            <td>{coupon.discountPercentage}%</td>
                                            <td>
                                                ₹{Number(coupon.minOrderAmount || 0)
                                                    .toLocaleString("en-IN")}
                                            </td>
                                            <td>
                                                {new Date(coupon.expiryDate)
                                                    .toLocaleDateString("en-IN")}
                                            </td>
                                            <td>
                                                {coupon.usedCount} / {coupon.usageLimit}
                                            </td>
                                            <td>
                                                {expired
                                                    ? "Expired"
                                                    : limitReached
                                                        ? "Limit Reached"
                                                        : coupon.isActive
                                                            ? "Active"
                                                            : "Inactive"}
                                            </td>
                                            <td>
                                                <div className="product-actions">
                                                    <button
                                                        type="button"
                                                        className="edit-product-btn"
                                                        onClick={() =>
                                                            handleEditCoupon(coupon)
                                                        }
                                                    >
                                                        Edit
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="edit-product-btn"
                                                        onClick={() =>
                                                            handleToggleCoupon(coupon)
                                                        }
                                                    >
                                                        {coupon.isActive
                                                            ? "Deactivate"
                                                            : "Activate"}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="delete-product-btn"
                                                        onClick={() =>
                                                            handleDeleteCoupon(coupon._id)
                                                        }
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* PRODUCT MANAGEMENT */}
            <section className="product-management" ref={productFormRef}>

                <h2>
                    {editingProductId
                        ? "Edit Product"
                        : "Add New Product"}
                </h2>

                <form
                    className="product-form"
                    onSubmit={handleProductSubmit}
                >

                    <div className="product-form-grid">

                        <div className="form-group">

                            <label>Product Name *</label>

                            <input
                                type="text"
                                name="name"
                                value={productForm.name}
                                onChange={handleProductInput}
                                placeholder="Enter product name"
                                required
                            />

                        </div>

                        <div className="form-group">

                            <label>Category *</label>

                            <input
                                type="text"
                                name="category"
                                value={productForm.category}
                                onChange={handleProductInput}
                                placeholder="Example: Electronics"
                                required
                            />

                        </div>

                        <div className="form-group">

                            <label>Price (₹) *</label>

                            <input
                                type="number"
                                name="price"
                                value={productForm.price}
                                onChange={handleProductInput}
                                placeholder="Enter price"
                                min="0"
                                step="0.01"
                                required
                            />

                        </div>

                        <div className="form-group">

                            <label>Stock *</label>

                            <input
                                type="number"
                                name="stock"
                                value={productForm.stock}
                                onChange={handleProductInput}
                                placeholder="Enter stock quantity"
                                min="0"
                                step="1"
                                required
                            />

                        </div>

                        <div className="form-group full-width">

                            <label>Image URL</label>

                            <input
                                type="url"
                                name="image"
                                value={productForm.image}
                                onChange={handleProductInput}
                                placeholder="https://example.com/product.jpg"
                            />

                        </div>

                        <div className="form-group full-width">

                            <label>Description *</label>

                            <textarea
                                name="description"
                                value={productForm.description}
                                onChange={handleProductInput}
                                placeholder="Enter product description"
                                rows="4"
                                required
                            />

                        </div>

                    </div>

                    <div className="product-form-actions">

                        <button
                            type="submit"
                            className="save-product-btn"
                            disabled={savingProduct}
                        >
                            {savingProduct
                                ? "Saving..."
                                : editingProductId
                                    ? "Update Product"
                                    : "Add Product"}
                        </button>

                        {editingProductId && (
                            <button
                                type="button"
                                className="cancel-edit-btn"
                                onClick={resetProductForm}
                            >
                                Cancel Edit
                            </button>
                        )}

                    </div>

                </form>

            </section>

            {/* ALL PRODUCTS */}
            <section className="products-section">

                <h2>All Products ({products.length})</h2>

                {productsLoading ? (
                    <p>Loading products...</p>
                ) : products.length === 0 ? (
                    <p>
                        No products found. Add your first product above.
                    </p>
                ) : (

                    <div className="table-wrapper">

                        <table className="admin-table">

                            <thead>
                                <tr>
                                    <th>Image</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {products.map((product) => (
                                    <tr key={product._id}>

                                        <td>
                                            {product.image ? (
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="admin-product-image"
                                                />
                                            ) : (
                                                "No Image"
                                            )}
                                        </td>

                                        <td>{product.name}</td>

                                        <td>{product.category}</td>

                                        <td>
                                            ₹{Number(product.price)
                                                .toLocaleString("en-IN")}
                                        </td>

                                        <td>{product.stock}</td>

                                        <td>

                                            <div className="product-actions">

                                                <button
                                                    type="button"
                                                    className="edit-product-btn"
                                                    onClick={() =>
                                                        handleEditProduct(product)
                                                    }
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    className="delete-product-btn"
                                                    onClick={() =>
                                                        handleDeleteProduct(
                                                            product._id
                                                        )
                                                    }
                                                >
                                                    Delete
                                                </button>

                                            </div>

                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>
                )}

            </section>

            {/* ORDER MANAGEMENT */}
            <section className="orders-section">

                <h2>All Orders</h2>

                {orders.length === 0 ? (
                    <p>No orders found.</p>
                ) : (

                    <div className="table-wrapper">

                        <table className="admin-table">

                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Customer</th>
                                    <th>Email</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                    <th>Update Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {orders.map((order) => (
                                    <tr key={order._id}>

                                        <td>
                                            {order._id.slice(-8)}
                                        </td>

                                        <td>
                                            {order.user?.name || "Unknown"}
                                        </td>

                                        <td>
                                            {order.user?.email || "N/A"}
                                        </td>

                                        <td>
                                            ₹{Number(
                                                order.totalAmount || 0
                                            ).toLocaleString("en-IN")}
                                        </td>

                                        <td>{order.status}</td>

                                        <td>

                                            <select
                                                value={order.status}
                                                onChange={(e) =>
                                                    handleStatusChange(
                                                        order._id,
                                                        e.target.value
                                                    )
                                                }
                                            >

                                                <option value="Pending">
                                                    Pending
                                                </option>

                                                <option value="Confirmed">
                                                    Confirmed
                                                </option>

                                                <option value="Shipped">
                                                    Shipped
                                                </option>

                                                <option value="Delivered">
                                                    Delivered
                                                </option>

                                                <option value="Cancelled">
                                                    Cancelled
                                                </option>

                                            </select>

                                        </td>

                                    </tr>
                                ))}
                            </tbody>

                        </table>

                    </div>
                )}

            </section>

        </div>
    );
}

export default AdminDashboard;
