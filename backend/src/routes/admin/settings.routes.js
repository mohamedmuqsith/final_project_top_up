import express from "express";
import { 
  getSettings, 
  updateSettings, 
  getPublicSettings 
} from "../../controllers/admin/settings.controller.js";
import { protect, admin } from "../../middleware/auth.middleware.js";

const router = express.Router();

// Admin routes
router.route("/")
  .get(protect, admin, getSettings)
  .patch(protect, admin, updateSettings);

// Public routes
router.get("/public", getPublicSettings);

export default router;
