
const mongoose = require("mongoose");
const Product = require("../models/Product");

// ADD PRODUCT
exports.addProduct = async (req, res) => {
    try {
        const {
            name,
            description,
            price,
            category,
            image,
            stock
        } = req.body;

        // Required field validation
        if (
            !name?.trim() ||
            !description?.trim() ||
            price === undefined ||
            !category?.trim()
        ) {
            return res.status(400).json({
                message: "Please fill all required fields."
            });
        }

        // Price validation
        if (!Number.isFinite(Number(price)) || Number(price) < 0) {
            return res.status(400).json({
                message: "Price must be a valid non-negative number."
            });
        }

        // Stock validation
        const productStock = stock === undefined ? 0 : Number(stock);

        if (
            !Number.isInteger(productStock) ||
            productStock < 0
        ) {
            return res.status(400).json({
                message: "Stock must be a non-negative whole number."
            });
        }

        const product = await Product.create({
            name: name.trim(),
            description: description.trim(),
            price: Number(price),
            category: category.trim(),
            image: image?.trim() || "",
            stock: productStock
        });

        return res.status(201).json({
            message: "Product added successfully!",
            product
        });

    } catch (error) {
        console.error("Add Product Error:", error.message);

        return res.status(500).json({
            message: "Failed to add product."
        });
    }
};


// GET ALL PRODUCTS
exports.getProducts = async (req, res) => {
    try {
        const products = await Product.find()
            .sort({ createdAt: -1 });

        return res.status(200).json({
            count: products.length,
            products
        });

    } catch (error) {
        console.error("Get Products Error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch products."
        });
    }
};


// GET SINGLE PRODUCT
exports.getProductById = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.status(200).json(product);

    } catch (error) {
        console.error("Get Product Error:", error.message);

        return res.status(500).json({
            message: "Failed to fetch product."
        });
    }
};


// UPDATE PRODUCT
exports.updateProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const allowedFields = [
            "name",
            "description",
            "price",
            "category",
            "image",
            "stock"
        ];

        const updates = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                message: "No valid fields provided for update."
            });
        }

        if (
            updates.name !== undefined &&
            (typeof updates.name !== "string" || !updates.name.trim())
        ) {
            return res.status(400).json({
                message: "Product name cannot be empty."
            });
        }

        if (
            updates.description !== undefined &&
            (typeof updates.description !== "string" ||
                !updates.description.trim())
        ) {
            return res.status(400).json({
                message: "Description cannot be empty."
            });
        }

        if (
            updates.category !== undefined &&
            (typeof updates.category !== "string" ||
                !updates.category.trim())
        ) {
            return res.status(400).json({
                message: "Category cannot be empty."
            });
        }

        if (updates.image !== undefined &&
            typeof updates.image !== "string") {
            return res.status(400).json({
                message: "Image must be a valid string."
            });
        }

        if (updates.price !== undefined) {
            const price = Number(updates.price);

            if (!Number.isFinite(price) || price < 0) {
                return res.status(400).json({
                    message: "Invalid product price."
                });
            }

            updates.price = price;
        }

        if (updates.stock !== undefined) {
            const stock = Number(updates.stock);

            if (!Number.isInteger(stock) || stock < 0) {
                return res.status(400).json({
                    message: "Stock must be a non-negative whole number."
                });
            }

            updates.stock = stock;
        }

        if (updates.name !== undefined) {
            updates.name = updates.name.trim();
        }

        if (updates.description !== undefined) {
            updates.description = updates.description.trim();
        }

        if (updates.category !== undefined) {
            updates.category = updates.category.trim();
        }

        if (updates.image !== undefined) {
            updates.image = updates.image.trim();
        }

        const product = await Product.findByIdAndUpdate(
            req.params.id,
            { $set: updates },
            {
                new: true,
                runValidators: true
            }
        );

        if (!product) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.status(200).json({
            message: "Product updated successfully!",
            product
        });

    } catch (error) {
        console.error("Update Product Error:", error.message);

        return res.status(500).json({
            message: "Failed to update product."
        });
    }
};


// DELETE PRODUCT
exports.deleteProduct = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                message: "Invalid product ID."
            });
        }

        const product = await Product.findByIdAndDelete(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found."
            });
        }

        return res.status(200).json({
            message: "Product deleted successfully!"
        });

    } catch (error) {
        console.error("Delete Product Error:", error.message);

        return res.status(500).json({
            message: "Failed to delete product."
        });
    }
};
