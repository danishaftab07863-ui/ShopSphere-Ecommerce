
const mongoose = require("mongoose");
const Product = require("../models/Product");
const User = require("../models/User");

// UPDATE PRODUCT RATING SUMMARY
const updateRatingSummary = (product) => {
    product.numReviews = product.reviews.length;

    product.averageRating = product.numReviews
        ? Number(
            (
                product.reviews.reduce(
                    (total, review) => total + review.rating,
                    0
                ) / product.numReviews
            ).toFixed(1)
        )
        : 0;
};

// ADD REVIEW
exports.addReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const numericRating = Number(rating);

        if (
            !Number.isInteger(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5."
            });
        }

        if (
            typeof comment !== "string" ||
            !comment.trim() ||
            comment.trim().length > 1000
        ) {
            return res.status(400).json({
                message: "Please enter a review (maximum 1000 characters)."
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        const alreadyReviewed = product.reviews.some(
            (review) => review.user.toString() === req.user.id
        );

        if (alreadyReviewed) {
            return res.status(400).json({
                message: "You have already reviewed this product."
            });
        }

        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found."
            });
        }

        product.reviews.push({
            user: user._id,
            name: user.name,
            rating: numericRating,
            comment: comment.trim()
        });

        updateRatingSummary(product);

        await product.save();

        return res.status(201).json({
            message: "Review added successfully!",
            product
        });

    } catch (error) {
        console.error("Add Review Error:", error.message);

        return res.status(500).json({
            message: "Unable to add review."
        });
    }
};


// UPDATE OWN REVIEW
exports.updateReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, comment } = req.body;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const numericRating = Number(rating);

        if (
            !Number.isInteger(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            return res.status(400).json({
                message: "Rating must be between 1 and 5."
            });
        }

        if (
            typeof comment !== "string" ||
            !comment.trim() ||
            comment.trim().length > 1000
        ) {
            return res.status(400).json({
                message: "Please enter a review (maximum 1000 characters)."
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        const review = product.reviews.find(
            (item) => item.user.toString() === req.user.id
        );

        if (!review) {
            return res.status(404).json({
                message: "Your review was not found."
            });
        }

        review.rating = numericRating;
        review.comment = comment.trim();

        updateRatingSummary(product);

        await product.save();

        return res.status(200).json({
            message: "Review updated successfully!",
            product
        });

    } catch (error) {
        console.error("Update Review Error:", error.message);

        return res.status(500).json({
            message: "Unable to update review."
        });
    }
};


// DELETE OWN REVIEW
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        const reviewIndex = product.reviews.findIndex(
            (item) => item.user.toString() === req.user.id
        );

        if (reviewIndex === -1) {
            return res.status(404).json({
                message: "Your review was not found."
            });
        }

        product.reviews.splice(reviewIndex, 1);

        updateRatingSummary(product);

        await product.save();

        return res.status(200).json({
            message: "Review deleted successfully!",
            product
        });

    } catch (error) {
        console.error("Delete Review Error:", error.message);

        return res.status(500).json({
            message: "Unable to delete review."
        });
    }
};
