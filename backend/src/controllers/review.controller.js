import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";

/**
 * Recalculate a product's averageRating and reviewCount
 * based on only "published" reviews.
 */
async function recalculateProductRating(productId) {
  const stats = await Review.aggregate([
    { $match: { productId, status: "published" } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const averageRating = stats[0]?.averageRating || 0;
  const reviewCount = stats[0]?.reviewCount || 0;

  await Product.findByIdAndUpdate(productId, { averageRating, reviewCount });
}

// POST /api/reviews
export async function createReview(req, res) {
  try {
    const { productId, orderId, rating, comment, title } = req.body;
    const user = req.user;

    // validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    if (!productId || !orderId) {
      return res.status(400).json({ error: "productId and orderId are required" });
    }

    // verify order exists, belongs to user, and is delivered
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.clerkId !== user.clerkId) {
      return res.status(403).json({ error: "Not authorized to review this order" });
    }

    if (order.status !== "delivered") {
      return res.status(400).json({ error: "Can only review delivered orders" });
    }

    // verify product is in the order
    const productInOrder = order.orderItems.find(
      (item) => item.product.toString() === productId.toString()
    );
    if (!productInOrder) {
      return res.status(400).json({ error: "Product not found in this order" });
    }

    // verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Upsert: one review per (userId, productId)
    // If review already exists, update it; otherwise create new
    const review = await Review.findOneAndUpdate(
      { userId: user._id, productId },
      {
        rating,
        comment: (comment || "").trim(),
        title: (title || "").trim(),
        orderId,
        userId: user._id,
        productId,
        isVerifiedPurchase: true, // validated via delivered order above
        status: "published",
      },
      { new: true, upsert: true, runValidators: true }
    );

    // Recalculate product rating
    await recalculateProductRating(product._id);

    res.status(201).json({ message: "Review submitted successfully", review });
  } catch (error) {
    // Handle duplicate key error gracefully
    if (error.code === 11000) {
      return res.status(409).json({ error: "You have already reviewed this product" });
    }
    console.error("Error in createReview controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /api/reviews/:reviewId
export async function updateReview(req, res) {
  try {
    const { reviewId } = req.params;
    const { rating, comment, title } = req.body;
    const user = req.user;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    // ownership check
    if (review.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to edit this review" });
    }

    // update fields
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: "Rating must be between 1 and 5" });
      }
      review.rating = rating;
    }
    if (comment !== undefined) review.comment = comment.trim();
    if (title !== undefined) review.title = title.trim();

    await review.save();

    // Recalculate product rating
    await recalculateProductRating(review.productId);

    res.status(200).json({ message: "Review updated successfully", review });
  } catch (error) {
    console.error("Error in updateReview controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// DELETE /api/reviews/:reviewId
export async function deleteReview(req, res) {
  try {
    const { reviewId } = req.params;
    const user = req.user;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    if (review.userId.toString() !== user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to delete this review" });
    }

    const productId = review.productId;
    await Review.findByIdAndDelete(reviewId);

    // Recalculate product rating
    await recalculateProductRating(productId);

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    console.error("Error in deleteReview controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/reviews/product/:productId
export async function getProductReviews(req, res) {
  try {
    const { productId } = req.params;

    const reviews = await Review.find({ productId, status: "published" })
      .populate("userId", "name imageUrl")
      .sort({ createdAt: -1 });

    // Compute rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;
    reviews.forEach((r) => {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      totalRating += r.rating;
    });

    res.status(200).json({
      reviews,
      reviewCount: reviews.length,
      averageRating: reviews.length > 0 ? totalRating / reviews.length : 0,
      ratingDistribution: distribution,
    });
  } catch (error) {
    console.error("Error in getProductReviews controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/reviews/me
export async function getUserReviews(req, res) {
  try {
    const user = req.user;

    const reviews = await Review.find({ userId: user._id })
      .populate("productId", "name images price")
      .sort({ createdAt: -1 });

    res.status(200).json({ reviews });
  } catch (error) {
    console.error("Error in getUserReviews controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}