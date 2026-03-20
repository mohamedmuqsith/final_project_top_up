import { Router } from "express";
import * as ProductAdmin from "../controllers/admin/productAdmin.controller.js";
import * as OrderAdmin from "../controllers/admin/orderAdmin.controller.js";
import * as CustomerAdmin from "../controllers/admin/customerAdmin.controller.js";
import * as ReportAdmin from "../controllers/admin/reportAdmin.controller.js";
import * as ReviewAdmin from "../controllers/admin/reviewAdmin.controller.js";
import { getOrderDocumentData } from "../controllers/orderDocument.controller.js";
import { adminOnly, protectRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/multer.middleware.js";

const router = Router();

// optimization - DRY
router.use(protectRoute, adminOnly);

router.post("/products", upload.array("images", 3), ProductAdmin.createProduct);
router.get("/products", ProductAdmin.getAllProducts);
router.put("/products/:id", upload.array("images", 3), ProductAdmin.updateProduct);
router.delete("/products/:id", ProductAdmin.deleteProduct);

router.get("/orders", OrderAdmin.getAllOrders);
router.get("/orders/:id", OrderAdmin.getOrderById);
router.patch("/orders/:orderId/status", OrderAdmin.updateOrderStatus);
router.patch("/orders/:orderId/return", OrderAdmin.handleReturnRequest);
router.post("/orders/:orderId/refund", OrderAdmin.processRefund);
router.get("/orders/:id/document-data", getOrderDocumentData);

router.get("/customers", CustomerAdmin.getAllCustomers);
router.get("/customers/:id/stats", CustomerAdmin.getCustomerStats);

router.get("/stats", ReportAdmin.getDashboardStats);
router.get("/alerts", ProductAdmin.getInventoryAlerts);
router.get("/sales-report", ReportAdmin.getSalesReport);
router.get("/inventory-report", ReportAdmin.getInventoryReport);
router.get("/restock-suggestions", ReportAdmin.getRestockSuggestions);

// Review management
router.get("/reviews", ReviewAdmin.getAdminReviews);
router.patch("/reviews/:id/status", ReviewAdmin.updateReviewStatus);
router.get("/reviews/analytics", ReviewAdmin.getReviewAnalytics);

// PUT: Used for full resource replacement, updating the entire resource
// PATCH: Used for partial resource updates, updating a specific part of the resource

export default router;