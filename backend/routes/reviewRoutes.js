
const express = require("express");
const router = express.Router();

const {
    addReview,
    updateReview,
    deleteReview
} = require("../controllers/reviewController");

const { protect } = require("../middleware/authMiddleware");

// Customer review routes
router.post("/:id", protect, addReview);
router.put("/:id", protect, updateReview);
router.delete("/:id", protect, deleteReview);

module.exports = router;
