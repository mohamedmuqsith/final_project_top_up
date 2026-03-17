import { Notification } from "../models/notification.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";

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
    const query = productIds.length > 0 ? { _id: { $in: productIds } } : {};
    const products = await Product.find(query, "name stock images lowStockThreshold").lean();

    if (products.length === 0) return;

    // We need 7-day sales velocity for PREDICTED_STOCKOUT
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Only aggregate sales for the products we are checking to save db cost
    const matchQuery = {
      createdAt: { $gte: sevenDaysAgo },
      "paymentResult.status": "succeeded",
      status: { $ne: "cancelled" },
    };

    const salesAggregation = await Order.aggregate([
      { $match: matchQuery },
      { $unwind: "$orderItems" },
      { 
        $match: productIds.length > 0 
          ? { "orderItems.product": { $in: products.map(p => p._id) } } 
          : {} 
      },
      {
        $group: {
          _id: "$orderItems.product",
          totalQuantitySold: { $sum: "$orderItems.quantity" },
        },
      },
    ]);

    const salesMap = {};
    salesAggregation.forEach((item) => {
      salesMap[item._id.toString()] = item.totalQuantitySold / 7;
    });

    for (const product of products) {
      const avgDaily = salesMap[product._id.toString()] || 0;
      const daysRemaining = avgDaily > 0 ? product.stock / avgDaily : Infinity;
      const threshold = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 10;

      // Determine current boolean conditions natively
      const isOutOfStock = product.stock <= 0;
      const isLowStock = !isOutOfStock && product.stock <= threshold;
      const isPredictedStockout = !isOutOfStock && !isLowStock && daysRemaining <= 7;

      // Ensure exact state resolution mapping
      await manageConditionState(product, "OUT_OF_STOCK", isOutOfStock);
      await manageConditionState(product, "LOW_STOCK", isLowStock);
      await manageConditionState(product, "PREDICTED_STOCKOUT", isPredictedStockout);
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
    entityId: product._id,
    isResolved: false
  });

  if (isConditionActive) {
    // Condition is TRUE. Check if we need to alert.
    // Condition is TRUE. Check if we need to alert.
    if (!activeNotification) {
      // Fire new operational notification
      let message = "";
      const threshold = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 10;

      if (type === "OUT_OF_STOCK") {
        message = `Business Alert: '${product.name}' is completely OUT OF STOCK. Immediate restock required.`;
      } else if (type === "LOW_STOCK") {
        message = `Business Alert: '${product.name}' is running low (${product.stock} units remaining). Threshold: ${threshold}.`;
      } else if (type === "PREDICTED_STOCKOUT") {
        message = `Predictive Alert: '${product.name}' is expected to stock out within 7 days based on current sales velocity.`;
      }

      if (message) {
        await createNotification({
          recipientType: "admin",
          title: type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
          message,
          type,
          entityId: product._id,
          entityModel: "Product",
          actionUrl: "/products"
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
