
const mongoose = require("mongoose");
const User = require("../models/User");
const Product = require("../models/Product");

// GET WISHLIST
exports.getWishlist = async (req, res) => {
    try {
        const user = await User.findById(req.user.id)
            .populate("wishlist");

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        res.status(200).json(user.wishlist);

    } catch (error) {
        console.error("Get Wishlist Error:", error.message);
        res.status(500).json({
            message: "Unable to fetch wishlist."
        });
    }
};

// ADD TO WISHLIST
exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        if (user.wishlist.some(
            id => id.toString() === productId
        )) {
            return res.status(400).json({
                message: "Product already in wishlist."
            });
        }

        user.wishlist.push(product._id);
        await user.save();

        res.status(200).json({
            message: "Product added to wishlist!"
        });

    } catch (error) {
        console.error("Add Wishlist Error:", error.message);
        res.status(500).json({
            message: "Unable to add product to wishlist."
        });
    }
};

// REMOVE FROM WISHLIST
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!mongoose.isValidObjectId(productId)) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        user.wishlist = user.wishlist.filter(
            id => id.toString() !== productId
        );

        await user.save();

        res.status(200).json({
            message: "Product removed from wishlist!"
        });

    } catch (error) {
        console.error("Remove Wishlist Error:", error.message);
        res.status(500).json({
            message: "Unable to remove product."
        });
    }
};
