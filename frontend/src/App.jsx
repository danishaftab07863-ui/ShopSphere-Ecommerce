
import { useState, useEffect } from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate
} from "react-router-dom";

import api from "./services/api";

import Products from "./pages/Products";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import MyOrders from "./pages/MyOrders";
import Wishlist from "./pages/Wishlist";
import AdminDashboard from "./pages/AdminDashboard";

import Navbar from "./components/Navbar";

import { CartProvider, useCart } from "./context/CartContext";

import "./App.css";

// SHOPSPHERE BRAND LOGO
function ShopSphereLogo() {
  return (
    <div className="shopsphere-brand">
      <svg
        viewBox="0 0 100 100"
        className="shopsphere-logo"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="ShopSphere logo"
      >
        <defs>
          <linearGradient id="shopBagGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>

        <path
          d="M30 36 V25 C30 8 70 8 70 25 V36"
          fill="none"
          stroke="#FBBF24"
          strokeWidth="7"
          strokeLinecap="round"
        />

        <path
          d="M19 34 H81 L88 84 Q88 91 80 91 H20 Q12 91 12 84 Z"
          fill="url(#shopBagGradient)"
        />

        <text
          x="50"
          y="76"
          textAnchor="middle"
          fontSize="43"
          fontWeight="bold"
          fill="white"
        >
          S
        </text>
      </svg>

      <div className="shopsphere-brand-text">
        <h2>ShopSphere</h2>
        <p>Shop Smart • Live Better</p>
      </div>
    </div>
  );
}

// ADMIN ROUTE PROTECTION
function AdminRoute({ children }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "null");

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return children;
}

// HOME PAGE
function Home() {
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const { totalItems } = useCart();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <div className="container">

      <ShopSphereLogo />

      <h1>Welcome to ShopSphere</h1>

      <p>
        {user
          ? `Hello, ${user.name}!`
          : "Discover amazing products at great prices."}
      </p>

      <div className="nav-links">
        <Link to="/products">View Products</Link>

        <Link to="/cart">
          Cart ({totalItems})
        </Link>

        {user && (
          <>
            <Link to="/wishlist">❤️ Wishlist</Link>
            <Link to="/my-orders">My Orders</Link>
          </>
        )}

        {user?.role === "admin" && (
          <Link to="/admin">Admin Dashboard</Link>
        )}

        {user ? (
          <button onClick={handleLogout}>Logout</button>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>

    </div>
  );
}

// LOGIN PAGE
function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (response.data.user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }

    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleLogin}>

        <ShopSphereLogo />

        <h1>Login</h1>
        <p>Welcome back to ShopSphere!</p>

        {message && <div className="message">{message}</div>}

        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p>
          Don't have an account? <Link to="/register">Register</Link>
        </p>

      </form>
    </div>
  );
}

// REGISTER PAGE
function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (password.length < 8) {
      setMessage("Password must contain at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/register", {
        name,
        email,
        password
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      navigate("/");

    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleRegister}>

        <ShopSphereLogo />

        <h1>Create Account</h1>
        <p>Join ShopSphere today!</p>

        {message && <div className="message">{message}</div>}

        <label>Full Name</label>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label>Password</label>
        <input
          type="password"
          placeholder="Minimum 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Register"}
        </button>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>

      </form>
    </div>
  );
}

// MAIN APP
function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("store-theme") || "light";
  });

  // APPLY AND SAVE SELECTED THEME
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("store-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((currentTheme) =>
      currentTheme === "light" ? "dark" : "light"
    );
  };

  return (
    <CartProvider>
      <BrowserRouter>

        {/* GLOBAL NAVBAR */}
        <Navbar
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/products" element={<Products />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/my-orders" element={<MyOrders />} />

          {/* WISHLIST ROUTE */}
          <Route path="/wishlist" element={<Wishlist />} />

          {/* ADMIN ROUTE */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
        </Routes>

      </BrowserRouter>
    </CartProvider>
  );
}

export default App;
