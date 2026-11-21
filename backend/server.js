
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./config/db");

dotenv.config();

const app = express();

// ================= MIDDLEWARE =================

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true
}));

app.use(express.json());

// ================= HOME ROUTE =================

app.get("/", (req, res) => {
    res.json({
        message: "E-commerce API is running!"
    });
});

// ================= AUTH ROUTES =================

app.use("/api/auth", require("./routes/authRoutes"));

// ================= PRODUCT ROUTES =================

const productRoutes = require("./routes/productRoutes");
app.use("/api/products", productRoutes);

// ================= ORDER ROUTES =================

const orderRoutes = require("./routes/orderRoutes");
app.use("/api/orders", orderRoutes);

// ================= ADMIN ROUTES =================

const adminRoutes = require("./routes/adminRoutes");
app.use("/api/admin", adminRoutes);

// ================= REVIEW ROUTES =================

const reviewRoutes = require("./routes/reviewRoutes");
app.use("/api/reviews", reviewRoutes);

// ================= WISHLIST ROUTES =================

const wishlistRoutes = require("./routes/wishlistRoutes");
app.use("/api/wishlist", wishlistRoutes);

// ================= COUPON ROUTES =================

const couponRoutes = require("./routes/couponRoutes");
app.use("/api/coupons", couponRoutes);

// ================= SERVER =================

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
