
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import "./Cart.css";

function Cart() {
    const navigate = useNavigate();

    const {
        cartItems,
        removeFromCart,
        updateQuantity,
        totalPrice,
        totalItems
    } = useCart();

    return (
        <div className="cart-page">
            <h1>Shopping Cart</h1>

            {cartItems.length === 0 ? (
                <p className="empty-cart">
                    Your cart is empty!
                </p>
            ) : (
                <>
                    <div className="cart-items">
                        {cartItems.map((item) => (
                            <div className="cart-item" key={item._id}>

                                <img
                                    src={
                                        item.image ||
                                        "https://placehold.co/150x150?text=Product"
                                    }
                                    alt={item.name}
                                />

                                <div className="cart-details">
                                    <h3>{item.name}</h3>
                                    <p>Price: ₹{item.price}</p>

                                    <label>Quantity: </label>

                                    <input
                                        type="number"
                                        min="1"
                                        max={item.stock}
                                        value={item.quantity}
                                        onChange={(e) =>
                                            updateQuantity(
                                                item._id,
                                                e.target.value
                                            )
                                        }
                                    />

                                    <p>
                                        Subtotal: ₹
                                        {item.price * item.quantity}
                                    </p>

                                    <button
                                        className="remove-btn"
                                        onClick={() =>
                                            removeFromCart(item._id)
                                        }
                                    >
                                        Remove
                                    </button>
                                </div>

                            </div>
                        ))}
                    </div>

                    <div className="cart-summary">
                        <h2>Order Summary</h2>

                        <p>Total Items: {totalItems}</p>

                        <h3>Total: ₹{totalPrice}</h3>

                        <button
                            onClick={() => navigate("/checkout")}
                            disabled={cartItems.length === 0}
                        >
                            Proceed to Checkout
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default Cart;
