
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import "./Wishlist.css";

function Wishlist() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState("");

    const fetchWishlist = async () => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("token");

            const response = await api.get("/wishlist", {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setProducts(response.data);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to load wishlist."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWishlist();
    }, []);

    const removeFromWishlist = async (productId) => {
        try {
            setRemovingId(productId);

            const token = localStorage.getItem("token");

            await api.delete(`/wishlist/${productId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            setProducts(prev =>
                prev.filter(product => product._id !== productId)
            );
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "Unable to remove product."
            );
        } finally {
            setRemovingId("");
        }
    };

    if (loading) {
        return <h2 className="wishlist-loading">Loading Wishlist...</h2>;
    }

    return (
        <div className="wishlist-page">
            <h1>❤️ My Wishlist</h1>

            {error && <p className="wishlist-error">{error}</p>}

            {products.length === 0 ? (
                <div className="empty-wishlist">
                    <h2>Your Wishlist is Empty!</h2>
                    <p>Save products you like to find them here.</p>
                    <Link to="/products" className="browse-products-btn">
                        Browse Products
                    </Link>
                </div>
            ) : (
                <div className="wishlist-grid">
                    {products.map(product => (
                        <div className="wishlist-card" key={product._id}>
                            {product.image && (
                                <img
                                    src={product.image}
                                    alt={product.name}
                                />
                            )}

                            <h3>{product.name}</h3>

                            <p className="wishlist-price">
                                ₹{product.price}
                            </p>

                            <p>{product.category}</p>

                            <button
                                onClick={() => removeFromWishlist(product._id)}
                                disabled={removingId === product._id}
                            >
                                {removingId === product._id
                                    ? "Removing..."
                                    : "Remove ❤️"}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Wishlist;
