import { Review } from "../../models/review.model.js";
import { Product } from "../../models/product.model.js";

// @desc    Get all reviews for admin
// @route   GET /api/admin/reviews
export const getAdminReviews = async (req, res) => {
  try {
    const { status, rating, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let query = {};
    if (status) query.status = status;
    if (rating) query.rating = parseInt(rating);
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } }
      ];
    }

    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("userId", "name email imageUrl")
        .populate("productId", "name images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(query)
    ]);

    res.status(200).json({
      reviews,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error("Error in getAdminReviews:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Update review status (published/flagged)
// @route   PATCH /api/admin/reviews/:id/status
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["published", "flagged"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const review = await Review.findByIdAndUpdate(id, { status }, { new: true });
    if (!review) return res.status(404).json({ error: "Review not found" });

    // Recalculate product rating if status changed to/from published
    // (Assuming recalculateProductRating exists in a review service or helper)
    
    res.status(200).json(review);
  } catch (error) {
    console.error("Error in updateReviewStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get review analytics
// @route   GET /api/admin/reviews/analytics
export const getReviewAnalytics = async (req, res) => {
  try {
    const reviewSummaryAgg = await Review.aggregate([
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);

    const flaggedCount = await Review.countDocuments({ status: "flagged" });

    const ratingDistributionAgg = await Review.aggregate([
      { $group: { _id: "$rating", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistributionAgg.forEach((item) => {
      ratingDistribution[item._id] = item.count;
    });

    const topRatedProducts = await Review.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$productId",
          avgRating: { $avg: "$rating" },
          reviewCount: { $sum: 1 }
        }
      },
      { $sort: { avgRating: -1, reviewCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      { $project: { _id: 1, name: "$product.name", avgRating: 1, reviewCount: 1 } }
    ]);

    res.status(200).json({
      summary: {
        totalReviews: reviewSummaryAgg[0]?.totalReviews || 0,
        averageRating: parseFloat((reviewSummaryAgg[0]?.averageRating || 0).toFixed(1)),
        flaggedCount,
      },
      ratingDistribution,
      topRatedProducts
    });
  } catch (error) {
    console.error("Error in getReviewAnalytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
