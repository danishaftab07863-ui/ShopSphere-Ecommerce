
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useCart } from "../context/CartContext";
import "./Products.css";

function Products() {
    const { addToCart } = useCart();
    const navigate = useNavigate();

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [editingId, setEditingId] = useState(null);

    // WISHLIST STATES
    const [wishlistIds, setWishlistIds] = useState([]);
    const [wishlistLoadingId, setWishlistLoadingId] = useState("");

    // REVIEW STATES
    const [activeReviewId, setActiveReviewId] = useState(null);
    const [reviewRating, setReviewRating] = useState(5);
    const [reviewComment, setReviewComment] = useState("");
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewError, setReviewError] = useState("");
    const [reviewMessage, setReviewMessage] = useState("");

    // EMPTY PRODUCT FORM
    const emptyForm = {
        name: "",
        description: "",
        price: "",
        category: "",
        image: "",
        stock: ""
    };

    const [form, setForm] = useState(emptyForm);

    // GET LOGGED-IN USER ID
    const getCurrentUserId = () => {
        try {
            const user = JSON.parse(
                localStorage.getItem("user") ||
                localStorage.getItem("userInfo") ||
                "null"
            );

            return user?._id || user?.id || "";

        } catch {
            return "";
        }
    };

    const currentUserId = getCurrentUserId();
    const token = localStorage.getItem("token");

    // FETCH PRODUCTS
    const fetchProducts = async () => {
        try {
            const response = await api.get("/products");

            setProducts(response.data.products || []);
            setError("");

        } catch (error) {
            setError("Products load nahi ho paye.");

        } finally {
            setLoading(false);
        }
    };

    // FETCH USER WISHLIST
    const fetchWishlist = async () => {
        if (!token) {
            setWishlistIds([]);
            return;
        }

        try {
            const response = await api.get("/wishlist", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const ids = response.data.map(
                product => product._id
            );

            setWishlistIds(ids);

        } catch (error) {
            console.error(
                "Wishlist fetch error:",
                error.response?.data?.message || error.message
            );
        }
    };

    // FETCH DATA ON PAGE LOAD
    useEffect(() => {
        fetchProducts();
        fetchWishlist();
    }, []);

    // GET PRODUCT STOCK STATUS
    const getStockStatus = (stock) => {
        const quantity = Number(stock) || 0;

        if (quantity <= 0) {
            return {
                label: "Out of Stock",
                className: "out-of-stock"
            };
        }

        if (quantity <= 5) {
            return {
                label: `Low Stock - Only ${quantity} left`,
                className: "low-stock"
            };
        }

        return {
            label: "In Stock",
            className: "in-stock"
        };
    };

    // PRODUCT FORM
    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    // ADD OR UPDATE PRODUCT
    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setMessage("");

        const productData = {
            ...form,
            price: Number(form.price),
            stock: Number(form.stock)
        };

        try {
            if (editingId) {
                await api.put(
                    `/products/${editingId}`,
                    productData
                );

                setMessage("Product updated successfully!");

            } else {
                await api.post(
                    "/products",
                    productData
                );

                setMessage("Product added successfully!");
            }

            setForm(emptyForm);
            setEditingId(null);

            await fetchProducts();

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Operation failed. Please try again."
            );
        }
    };

    // EDIT PRODUCT
    const handleEdit = (product) => {
        setEditingId(product._id);

        setForm({
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            image: product.image || "",
            stock: product.stock ?? 0
        });

        setMessage("");
        setError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    // CANCEL EDIT
    const handleCancelEdit = () => {
        setEditingId(null);
        setForm(emptyForm);
        setMessage("");
        setError("");
    };

    // DELETE PRODUCT
    const handleDelete = async (id) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to delete this product?"
        );

        if (!confirmDelete) return;

        try {
            await api.delete(`/products/${id}`);

            setMessage("Product deleted successfully!");
            setError("");

            await fetchProducts();

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Product delete nahi ho paya."
            );
        }
    };

    // ADD TO CART
    const handleAddToCart = (product) => {
        if (Number(product.stock) < 1) {
            setError("Sorry, this product is out of stock.");
            return;
        }

        addToCart(product);

        setMessage(`${product.name} added to cart!`);
        setError("");
    };

    // ADD OR REMOVE FROM WISHLIST
    const handleWishlist = async (product) => {
        if (!token) {
            navigate("/login");
            return;
        }

        try {
            setWishlistLoadingId(product._id);
            setError("");
            setMessage("");

            const isInWishlist = wishlistIds.includes(
                product._id
            );

            if (isInWishlist) {
                await api.delete(
                    `/wishlist/${product._id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                setWishlistIds(prev =>
                    prev.filter(id => id !== product._id)
                );

                setMessage(
                    `${product.name} removed from wishlist!`
                );

            } else {
                await api.post(
                    `/wishlist/${product._id}`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                setWishlistIds(prev => [
                    ...prev,
                    product._id
                ]);

                setMessage(
                    `${product.name} added to wishlist!`
                );
            }

        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Wishlist update nahi ho payi."
            );

        } finally {
            setWishlistLoadingId("");
        }
    };

    // OPEN REVIEW FORM
    const openReviewForm = (
        product,
        existingReview = null
    ) => {
        if (!token) {
            navigate("/login");
            return;
        }

        setActiveReviewId(product._id);
        setReviewRating(existingReview?.rating || 5);
        setReviewComment(existingReview?.comment || "");
        setReviewError("");
        setReviewMessage("");
    };

    // SUBMIT OR UPDATE REVIEW
    const handleReviewSubmit = async (
        e,
        productId,
        existingReview
    ) => {
        e.preventDefault();

        if (!token) {
            navigate("/login");
            return;
        }

        if (!reviewComment.trim()) {
            setReviewError("Please write your review.");
            return;
        }

        try {
            setReviewLoading(true);
            setReviewError("");
            setReviewMessage("");

            const config = {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            };

            let response;

            if (existingReview) {
                response = await api.put(
                    `/reviews/${productId}`,
                    {
                        rating: reviewRating,
                        comment: reviewComment
                    },
                    config
                );

            } else {
                response = await api.post(
                    `/reviews/${productId}`,
                    {
                        rating: reviewRating,
                        comment: reviewComment
                    },
                    config
                );
            }

            setReviewMessage(
                response.data.message ||
                "Review saved successfully!"
            );

            setActiveReviewId(null);
            setReviewComment("");
            setReviewRating(5);

            await fetchProducts();

        } catch (error) {
            setReviewError(
                error.response?.data?.message ||
                "Unable to save review."
            );

        } finally {
            setReviewLoading(false);
        }
    };

    // DELETE OWN REVIEW
    const handleDeleteReview = async (productId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete your review?"
        );

        if (!confirmed) return;

        try {
            setReviewLoading(true);
            setReviewError("");

            const response = await api.delete(
                `/reviews/${productId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setReviewMessage(
                response.data.message ||
                "Review deleted successfully!"
            );

            await fetchProducts();

        } catch (error) {
            setReviewError(
                error.response?.data?.message ||
                "Unable to delete review."
            );

        } finally {
            setReviewLoading(false);
        }
    };

    // LOADING
    if (loading) {
        return <h2>Loading products...</h2>;
    }

    return (
        <div className="products-page">

            <h1>Our Products</h1>

            {/* ADD / EDIT PRODUCT FORM */}

            <div className="add-product-section">

                <h2>
                    {editingId
                        ? "Edit Product"
                        : "Add New Product"}
                </h2>

                {message && (
                    <p className="success">{message}</p>
                )}

                {error && (
                    <p className="error">{error}</p>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="product-form"
                >

                    <input
                        name="name"
                        placeholder="Product Name"
                        value={form.name}
                        onChange={handleChange}
                        required
                    />

                    <textarea
                        name="description"
                        placeholder="Product Description"
                        value={form.description}
                        onChange={handleChange}
                        required
                    />

                    <input
                        type="number"
                        name="price"
                        placeholder="Price"
                        min="0"
                        step="0.01"
                        value={form.price}
                        onChange={handleChange}
                        required
                    />

                    <input
                        name="category"
                        placeholder="Category"
                        value={form.category}
                        onChange={handleChange}
                        required
                    />

                    <input
                        name="image"
                        placeholder="Image URL (optional)"
                        value={form.image}
                        onChange={handleChange}
                    />

                    {/* STOCK INPUT */}

                    <input
                        type="number"
                        name="stock"
                        placeholder="Stock Quantity"
                        min="0"
                        step="1"
                        value={form.stock}
                        onChange={handleChange}
                        required
                    />

                    <button type="submit">
                        {editingId
                            ? "Update Product"
                            : "Add Product"}
                    </button>

                    {editingId && (
                        <button
                            type="button"
                            className="cancel-btn"
                            onClick={handleCancelEdit}
                        >
                            Cancel Edit
                        </button>
                    )}

                </form>
            </div>

            {/* AVAILABLE PRODUCTS */}

            <h2>Available Products</h2>

            {products.length === 0 ? (
                <p>No products available yet.</p>

            ) : (

                <div className="products-grid">

                    {products.map((product) => {

                        const reviews = product.reviews || [];

                        const ownReview = reviews.find(
                            (review) =>
                                currentUserId &&
                                String(
                                    review.user?._id ||
                                    review.user
                                ) === String(currentUserId)
                        );

                        const isInWishlist =
                            wishlistIds.includes(product._id);

                        const stockStatus = getStockStatus(
                            product.stock
                        );

                        return (

                            <div
                                className="product-card"
                                key={product._id}
                            >

                                {/* PRODUCT IMAGE */}

                                <img
                                    src={
                                        product.image ||
                                        "https://placehold.co/300x200?text=Product"
                                    }
                                    alt={product.name}
                                />

                                <h3>{product.name}</h3>

                                <p>{product.description}</p>

                                <h2>₹{product.price}</h2>

                                <p>
                                    Category: {product.category}
                                </p>

                                {/* STOCK AVAILABILITY */}

                                <div className="stock-info">

                                    <span className="stock-label">
                                        Stock Availability:
                                    </span>

                                    <span
                                        className={`stock-badge ${stockStatus.className}`}
                                    >
                                        {stockStatus.label}
                                    </span>

                                </div>

                                {/* PRODUCT RATING */}

                                <div className="product-rating">

                                    <span className="rating-stars">

                                        {"★".repeat(
                                            Math.round(
                                                product.averageRating || 0
                                            )
                                        )}

                                        {"☆".repeat(
                                            5 - Math.round(
                                                product.averageRating || 0
                                            )
                                        )}

                                    </span>

                                    <strong>
                                        {(product.averageRating || 0).toFixed(1)}
                                    </strong>

                                    <span>
                                        ({product.numReviews || 0} reviews)
                                    </span>

                                </div>

                                {/* ADD TO CART */}

                                <button
                                    className="add-to-cart-btn"
                                    onClick={() =>
                                        handleAddToCart(product)
                                    }
                                    disabled={
                                        Number(product.stock) < 1
                                    }
                                >
                                    {Number(product.stock) < 1
                                        ? "Out of Stock"
                                        : "Add to Cart"}
                                </button>

                                {/* WISHLIST BUTTON */}

                                <button
                                    type="button"
                                    className="wishlist-toggle-btn"
                                    onClick={() =>
                                        handleWishlist(product)
                                    }
                                    disabled={
                                        wishlistLoadingId === product._id
                                    }
                                >
                                    {wishlistLoadingId === product._id
                                        ? "Please wait..."
                                        : isInWishlist
                                            ? "❤️ Remove from Wishlist"
                                            : "🤍 Add to Wishlist"}
                                </button>

                                {/* ADMIN PRODUCT ACTIONS */}

                                <div className="product-actions">

                                    <button
                                        onClick={() =>
                                            handleEdit(product)
                                        }
                                        className="edit-btn"
                                    >
                                        Edit
                                    </button>

                                    <button
                                        onClick={() =>
                                            handleDelete(product._id)
                                        }
                                        className="delete-btn"
                                    >
                                        Delete
                                    </button>

                                </div>

                                {/* CUSTOMER REVIEWS */}

                                <div className="reviews-section">

                                    <h4>Customer Reviews</h4>

                                    {reviews.length === 0 ? (

                                        <p className="no-reviews">
                                            No reviews yet. Be the first!
                                        </p>

                                    ) : (

                                        reviews.map((review) => (

                                            <div
                                                className="review-item"
                                                key={review._id}
                                            >

                                                <strong>
                                                    {review.name}
                                                </strong>

                                                <div className="review-stars">
                                                    {"★".repeat(review.rating)}
                                                    {"☆".repeat(
                                                        5 - review.rating
                                                    )}
                                                </div>

                                                <p>{review.comment}</p>

                                                <small>
                                                    {new Date(
                                                        review.createdAt
                                                    ).toLocaleDateString()}
                                                </small>

                                            </div>

                                        ))

                                    )}

                                    {/* REVIEW ACTIONS */}

                                    {ownReview ? (

                                        <div className="review-actions">

                                            <button
                                                type="button"
                                                className="edit-review-btn"
                                                onClick={() =>
                                                    openReviewForm(
                                                        product,
                                                        ownReview
                                                    )
                                                }
                                            >
                                                Edit My Review
                                            </button>

                                            <button
                                                type="button"
                                                className="delete-review-btn"
                                                onClick={() =>
                                                    handleDeleteReview(
                                                        product._id
                                                    )
                                                }
                                                disabled={reviewLoading}
                                            >
                                                Delete My Review
                                            </button>

                                        </div>

                                    ) : (

                                        <button
                                            type="button"
                                            className="write-review-btn"
                                            onClick={() =>
                                                openReviewForm(product)
                                            }
                                        >
                                            Write a Review
                                        </button>

                                    )}

                                    {/* REVIEW FORM */}

                                    {activeReviewId === product._id && (

                                        <form
                                            className="review-form"
                                            onSubmit={(e) =>
                                                handleReviewSubmit(
                                                    e,
                                                    product._id,
                                                    ownReview
                                                )
                                            }
                                        >

                                            <h4>
                                                {ownReview
                                                    ? "Edit Your Review"
                                                    : "Write Your Review"}
                                            </h4>

                                            <label>Rating:</label>

                                            <div className="rating-selector">

                                                {[1, 2, 3, 4, 5].map(
                                                    (star) => (

                                                        <button
                                                            type="button"
                                                            key={star}
                                                            className={
                                                                star <= reviewRating
                                                                    ? "star-active"
                                                                    : "star-inactive"
                                                            }
                                                            onClick={() =>
                                                                setReviewRating(star)
                                                            }
                                                        >
                                                            ★
                                                        </button>

                                                    )
                                                )}

                                            </div>

                                            <textarea
                                                value={reviewComment}
                                                onChange={(e) =>
                                                    setReviewComment(
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="Write your experience..."
                                                maxLength={1000}
                                                required
                                            />

                                            <small>
                                                {reviewComment.length}/1000 characters
                                            </small>

                                            {reviewError && (
                                                <p className="error">
                                                    {reviewError}
                                                </p>
                                            )}

                                            <button
                                                type="submit"
                                                className="submit-review-btn"
                                                disabled={reviewLoading}
                                            >
                                                {reviewLoading
                                                    ? "Saving..."
                                                    : "Submit Review"}
                                            </button>

                                            <button
                                                type="button"
                                                className="cancel-review-btn"
                                                onClick={() =>
                                                    setActiveReviewId(null)
                                                }
                                            >
                                                Cancel
                                            </button>

                                        </form>

                                    )}

                                </div>

                            </div>

                        );

                    })}

                </div>

            )}

            {/* GLOBAL REVIEW MESSAGES */}

            {reviewMessage && (
                <p className="success review-global-message">
                    {reviewMessage}
                </p>
            )}

            {reviewError && (
                <p className="error review-global-message">
                    {reviewError}
                </p>
            )}

        </div>
    );
}

export default Products;
