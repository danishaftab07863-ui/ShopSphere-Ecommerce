import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./Navbar.css";

function Navbar({ theme, onToggleTheme }) {
    const [menuOpen, setMenuOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();
    const { totalItems } = useCart();

    const user = JSON.parse(localStorage.getItem("user") || "null");

    // Hide navbar on authentication pages
    if (location.pathname === "/login" || location.pathname === "/register") {
        return null;
    }

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setMenuOpen(false);
        navigate("/login");
    };

    const closeMenu = () => setMenuOpen(false);

    return (
        <nav className="main-navbar">

            <Link to="/" className="navbar-brand" onClick={closeMenu}>
                <span className="navbar-logo">S</span>
                <span className="navbar-brand-text">ShopSphere</span>
            </Link>

            <button
                className="menu-toggle"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label="Toggle navigation menu"
                aria-expanded={menuOpen}
            >
                {menuOpen ? "✕" : "☰"}
            </button>

            <div className={`navbar-links ${menuOpen ? "active" : ""}`}>

                <Link to="/" onClick={closeMenu}>Home</Link>

                <Link to="/products" onClick={closeMenu}>Products</Link>

                <Link to="/cart" onClick={closeMenu}>
                    Cart ({totalItems})
                </Link>

                {user && (
                    <>
                        <Link to="/wishlist" onClick={closeMenu}>
                            ❤️ Wishlist
                        </Link>

                        <Link to="/my-orders" onClick={closeMenu}>
                            My Orders
                        </Link>
                    </>
                )}

                {user?.role === "admin" && (
                    <Link to="/admin" onClick={closeMenu}>
                        Admin Dashboard
                    </Link>
                )}

                <button
                    type="button"
                    className="navbar-theme-btn"
                    onClick={onToggleTheme}
                >
                    {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
                </button>

                {user ? (
                    <button
                        type="button"
                        className="navbar-logout-btn"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                ) : (
                    <>
                        <Link to="/login" onClick={closeMenu}>Login</Link>
                        <Link to="/register" onClick={closeMenu}>Register</Link>
                    </>
                )}

            </div>

        </nav>
    );
}

export default Navbar;