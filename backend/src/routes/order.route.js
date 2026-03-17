import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { createOrder, getUserOrders, requestOrderReturn } from "../controllers/order.controller.js";
import { getOrderDocumentData } from "../controllers/orderDocument.controller.js";

const router = Router();

router.post("/", protectRoute, createOrder);
router.get("/", protectRoute, getUserOrders);
router.get("/:id/document-data", protectRoute, getOrderDocumentData);
router.post("/:id/return", protectRoute, requestOrderReturn);

export default router;