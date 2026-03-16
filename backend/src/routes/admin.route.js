import { Router } from "express";
import {
  createProduct,
  getAllCustomers,
  getAllOrders,
  getAllProducts,
  getDashboardStats,
  updateOrderStatus,
  updateProduct,
  deleteProduct,
  getInventoryAlerts,
  getSalesReport,
  getInventoryReport,
  getRestockSuggestions,
  getAdminReviews,
  updateReviewStatus,
  getReviewAnalytics,
} from "../controllers/admin.controller.js";
import { adminOnly, protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// optimization - DRY
router.use(protectRoute, adminOnly);

router.post("/products", upload.array("images", 3), createProduct);
router.get("/products", getAllProducts);
router.put("/products/:id", upload.array("images", 3), updateProduct);
router.delete("/products/:id", deleteProduct);

router.get("/orders", getAllOrders);
router.patch("/orders/:orderId/status", updateOrderStatus);

router.get("/customers", getAllCustomers);

router.get("/stats", getDashboardStats);
router.get("/alerts", getInventoryAlerts);
router.get("/sales-report", getSalesReport);
router.get("/inventory-report", getInventoryReport);
router.get("/restock-suggestions", getRestockSuggestions);

// Review management
router.get("/reviews", getAdminReviews);
router.patch("/reviews/:id/status", updateReviewStatus);
router.get("/reviews/analytics", getReviewAnalytics);

// PUT: Used for full resource replacement, updating the entire resource
// PATCH: Used for partial resource updates, updating a specific part of the resource

export default router;