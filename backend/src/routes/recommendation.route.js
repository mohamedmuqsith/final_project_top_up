import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getSimilarProducts,
  getPersonalizedRecommendations,
  getTrendingProducts,
  getFrequentlyBoughtTogether
} from "../controllers/recommendation.controller.js";

const router = Router();

router.get("/similar/:productId", getSimilarProducts);
router.get("/personalized", protectRoute, getPersonalizedRecommendations);
router.get("/trending", getTrendingProducts);
router.get("/bought-together/:productId", getFrequentlyBoughtTogether);

export default router;
