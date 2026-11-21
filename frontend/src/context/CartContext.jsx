
import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext();

export const useCart = () => useContext(CartContext);

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("cartItems")) || [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem("cartItems", JSON.stringify(cartItems));
    }, [cartItems]);

    // ADD TO CART
    const addToCart = (product) => {
        setCartItems((previousItems) => {
            const existingItem = previousItems.find(
                (item) => item._id === product._id
            );

            if (existingItem) {
                return previousItems.map((item) =>
                    item._id === product._id
                        ? {
                            ...item,
                            quantity: Math.min(
                                item.quantity + 1,
                                item.stock
                            )
                        }
                        : item
                );
            }

            if (product.stock < 1) return previousItems;

            return [
                ...previousItems,
                { ...product, quantity: 1 }
            ];
        });
    };

    // REMOVE FROM CART
    const removeFromCart = (productId) => {
        setCartItems((items) =>
            items.filter((item) => item._id !== productId)
        );
    };

    // UPDATE QUANTITY
    const updateQuantity = (productId, quantity) => {
        setCartItems((items) =>
            items.map((item) =>
                item._id === productId
                    ? {
                        ...item,
                        quantity: Math.max(
                            1,
                            Math.min(Number(quantity), item.stock)
                        )
                    }
                    : item
            )
        );
    };

    // CLEAR CART
    const clearCart = () => {
        setCartItems([]);
    };

    // TOTAL PRICE
    const totalPrice = cartItems.reduce(
        (total, item) => total + item.price * item.quantity,
        0
    );

    const totalItems = cartItems.reduce(
        (total, item) => total + item.quantity,
        0
    );

    return (
        <CartContext.Provider
            value={{
                cartItems,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                totalPrice,
                totalItems
            }}
        >
            {children}
        </CartContext.Provider>
    );
}
