import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createPaymentIntent, handleWebhook, confirmPayment, createCodOrder, markAsPaid } from "../controllers/payment.controller.js";

const router = Router();

router.post("/create-intent", protectRoute, createPaymentIntent);
router.post("/confirm", protectRoute, confirmPayment);
router.post("/cod-order", protectRoute, createCodOrder);
router.post("/:orderId/mark-as-paid", protectRoute, markAsPaid); // Admin role check inside controller or via middleware if exist

// No auth needed - Stripe validates via signature
router.post("/webhook", handleWebhook);

export default router;