import { Router } from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} from "../controllers/notification.controller.js";

const router = Router();

router.use(protectRoute);

router.get("/", getNotifications);
router.patch("/read-all", markAllAsRead);
router.get("/unread-count", getUnreadCount);
router.patch("/:id/read", markAsRead);

export default router;
