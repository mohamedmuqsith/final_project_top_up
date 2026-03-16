import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  createReview,
  updateReview,
  deleteReview,
  getProductReviews,
  getUserReviews,
} from "../controllers/review.controller.js";

const router = Router();

// Public — no auth required
router.get("/product/:productId", getProductReviews);

// Protected — auth required
router.post("/", protectRoute, createReview);
router.patch("/:reviewId", protectRoute, updateReview);
router.delete("/:reviewId", protectRoute, deleteReview);
router.get("/me", protectRoute, getUserReviews);

export default router;