import express from "express";
import { protectRoute, adminOnly } from "../middleware/auth.middleware.js";
import {
  createOffer,
  getOffers,
  updateOffer,
  deleteOffer,
  getActiveOffers,
  validateCoupon,
} from "../controllers/offer.controller.js";

const router = express.Router();

// Public/Customer routes
router.get("/active", getActiveOffers);
router.post("/validate-coupon", protectRoute, validateCoupon);

// Admin routes
router.get("/", protectRoute, adminOnly, getOffers);
router.post("/", protectRoute, adminOnly, createOffer);
router.put("/:id", protectRoute, adminOnly, updateOffer);
router.delete("/:id", protectRoute, adminOnly, deleteOffer);

export default router;
