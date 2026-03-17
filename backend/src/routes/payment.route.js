import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createPaymentIntent, handleWebhook, confirmPayment } from "../controllers/payment.controller.js";

const router = Router();

router.post("/create-intent", protectRoute, createPaymentIntent);
router.post("/confirm", protectRoute, confirmPayment);

// No auth needed - Stripe validates via signature
router.post("/webhook", handleWebhook);

export default router;