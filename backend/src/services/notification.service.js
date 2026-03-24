import { Notification } from "../models/notification.model.js";
import { Product } from "../models/product.model.js";
import { InventoryService } from "./inventory.service.js";

/**
 * Core notification creation wrapper with optional deduplication.
 * Prevents spamming the same unread notification for the same entity.
 */
export async function createNotification(data) {
  try {
    const { recipientId, recipientType, type, entityId, shouldDeduplicate = true } = data;

    if (shouldDeduplicate && entityId && type) {
      // Check if an identical unread notification already exists
      const existing = await Notification.findOne({
        recipientType,
        ...(recipientId && { recipientId }),
        type,
        entityId,
        isRead: false
      });

      if (existing) {
        // Update timestamp instead of creating a new one to keep it at the top
        // This effectively deduplicates while keeping the notification "fresh"
        existing.createdAt = new Date();
        await existing.save();
        return existing;
      }
    }

    const notification = await Notification.create(data);
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
}

/**
 * Checks inventory for specified products and safely manages 
 * the lifecycle of LOW_STOCK, PREDICTED_STOCKOUT, and OUT_OF_STOCK notifications.
 * Uses `isResolved` to deduplicate and prevent spam.
 * 
 * @param {Array<string>} productIds - Array of product ObjectIds to evaluate. 
 *                                     If empty, evaluates all products.
 */
export async function checkAndCreateInventoryNotifications(productIds = []) {
  try {
    // 1. Get standardized predictions from centralized engine
    const predictions = await InventoryService.calculateStockPredictions({ 
      lookbackDays: 30, 
      productIds 
    });

    for (const p of predictions) {
      // Determine current boolean conditions
      const isOutOfStock = p.alertType === "Out of Stock";
      const isLowStock = p.alertType === "Low Stock";
      const isPredictedStockout = p.alertType === "Predicted Stockout";

      // Ensure exact state resolution mapping
      await manageConditionState(p, "OUT_OF_STOCK", isOutOfStock);
      await manageConditionState(p, "LOW_STOCK", isLowStock);
      await manageConditionState(p, "PREDICTED_STOCKOUT", isPredictedStockout);
    }
  } catch (error) {
    console.error("Error in checkAndCreateInventoryNotifications:", error);
  }
}

/**
 * Helper to handle the Active/Resolved lifecycle of a specific inventory condition.
 */
async function manageConditionState(product, type, isConditionActive) {
  // Check if there is already an active (unresolved) notification for this product+type
  const activeNotification = await Notification.findOne({
    recipientType: "admin",
    type: type,
    entityId: product.productId,
    isResolved: false
  });

  if (isConditionActive) {
    // Condition is TRUE. Check if we need to alert.
    if (!activeNotification) {
      // Fire new operational notification
      let message = "";
      const threshold = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 10;

      if (type === "OUT_OF_STOCK") {
        message = `Business Alert: '${product.name}' is completely OUT OF STOCK. Immediate restock required.`;
      } else if (type === "LOW_STOCK") {
        message = `Business Alert: '${product.name}' is running low (${product.currentStock} units remaining). Threshold: ${product.lowStockThreshold}.`;
      } else if (type === "PREDICTED_STOCKOUT") {
        message = `Predictive Alert: '${product.name}' is expected to stock out within ${product.daysRemaining} days based on current sales velocity.`;
      }

      if (message) {
        await createNotification({
          recipientType: "admin",
          title: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
          message,
          type,
          entityId: product.productId,
          entityModel: "Product",
        });
      }
    }
  } else {
    // Condition is FALSE. Check if there's a dangling alert we need to resolve.
    if (activeNotification) {
      await Notification.findByIdAndUpdate(activeNotification._id, { isResolved: true });
    }
  }
}
