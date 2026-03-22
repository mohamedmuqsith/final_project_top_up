import { Order } from "../models/order.model.js";
import { InventoryService } from "./inventory.service.js";
import { createNotification, checkAndCreateInventoryNotifications } from "./notification.service.js";

/**
 * Service to handle shared order lifecycle logic.
 * Ensures consistency across Online and COD payment paths.
 */
export const OrderService = {
  /**
   * Status transition validation rules.
   */
  ALLOWED_TRANSITIONS: {
    pending: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [], // Terminal
    cancelled: [], // Terminal
  },

  /**
   * Validates if an order can transition to a new status.
   */
  validateStatusTransition(currentStatus, newStatus) {
    if (currentStatus === newStatus) return true;
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
    }
    return true;
  },

  /**
   * Finalizes an order (Online Payment Success or COD Creation).
   * Handles stock deduction and notifications.
   */
  async finalizeOrder(order, { paymentMethod, paymentStatus, comment, notificationType }) {
    if (order.isFinalized) {
      console.log(`[OrderService] Order ${order._id} already finalized. Skipping.`);
      return order;
    }

    console.log(`[OrderService] Finalizing order ${order._id} via ${paymentMethod}`);
    
    // 1. Deduct Stock
    await InventoryService.deductStock(order.orderItems);

    // 2. Update Order State
    order.isFinalized = true;
    order.paymentMethod = paymentMethod;
    order.paymentStatus = paymentStatus;
    order.status = "pending";
    
    order.statusHistory.push({
      status: "pending",
      timestamp: new Date(),
      comment: comment || "Payment confirmed. Awaiting fulfillment.",
      changedByType: "system"
    });

    await order.save();

    // 3. Notifications
    await createNotification({
      recipientType: "customer",
      recipientId: order.user.toString(),
      title: paymentMethod === "cod" ? "Order Placed (Cash on Delivery)" : "Order Placed Successfully",
      message: paymentMethod === "cod" 
        ? "Your COD order has been received and is currently pending. Please have the amount ready at delivery."
        : `Your order for $${order.totalPrice.toFixed(2)} has been received and is currently pending.`,
      type: "ORDER_PLACED",
      entityId: order._id,
      entityModel: "Order",
    });

    await createNotification({
      recipientType: "admin",
      title: paymentMethod === "cod" ? "New COD Order" : "New Online Order",
      message: `${paymentMethod === "cod" ? "COD" : "Payment"} confirmed for Order #${order._id.toString().slice(-6).toUpperCase()}.`,
      type: "NEW_ORDER",
      entityId: order._id,
      entityModel: "Order",
    });

    // 4. Inventory checks (low stock alerts)
    const productIds = order.orderItems.map(item => item.product._id || item.product);
    await checkAndCreateInventoryNotifications(productIds);

    return order;
  },

  /**
   * Cancels an order and restores stock safely.
   */
  async cancelOrder(order, { actorId, actorType, comment }) {
    if (order.status === "cancelled") {
      console.log(`[OrderService] Order ${order._id} already cancelled.`);
      return order;
    }

    console.log(`[OrderService] Cancelling order ${order._id}`);
    
    const oldStatus = order.status;
    order.status = "cancelled";
    
    // Only restore stock if the order was finalized (stock was deducted)
    if (order.isFinalized) {
      await InventoryService.restoreStock(order);
    }

    if (order.paymentStatus === "pending") {
      order.paymentStatus = "failed";
    }

    order.statusHistory.push({
      status: "cancelled",
      timestamp: new Date(),
      comment: comment || `Order cancelled by ${actorType}.`,
      changedBy: actorId,
      changedByType: actorType
    });

    await order.save();

    // Notifications
    await createNotification({
      recipientType: "customer",
      recipientId: order.user.toString(),
      title: "Order Cancelled",
      message: "Your order has been cancelled. If payment was made, a refund will be processed shortly.",
      type: "ORDER_CANCELLED",
      entityId: order._id,
      entityModel: "Order",
    });

    await createNotification({
      recipientType: "admin",
      title: "Order Cancelled",
      message: `Operational Alert: Order #${order._id.toString().slice(-6).toUpperCase()} marked as CANCELLED.`,
      type: "ORDER_CANCELLED",
      entityId: order._id,
      entityModel: "Order",
    });

    return order;
  },

  /**
   * Processes a refund safely for a paid order.
   * Idempotent: Does nothing if already refunded.
   */
  async processRefund(order, { actorId, actorType, reason }) {
    if (order.paymentStatus === "refunded") {
      console.log(`[OrderService] Order ${order._id} already refunded.`);
      return order;
    }

    if (order.paymentStatus !== "paid") {
      throw new Error(`Cannot refund order ${order._id} with paymentStatus '${order.paymentStatus}'. Must be 'paid'.`);
    }

    console.log(`[OrderService] Processing refund for order ${order._id}`);
    
    order.paymentStatus = "refunded";
    
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      comment: reason || "Refund processed.",
      changedBy: actorId,
      changedByType: actorType
    });

    await order.save();

    // Notifications
    await createNotification({
      recipientType: "customer",
      recipientId: order.user.toString(),
      title: "Refund Processed",
      message: `A refund of $${order.totalPrice.toFixed(2)} has been processed for your order.`,
      type: "ORDER_REFUNDED",
      entityId: order._id,
      entityModel: "Order",
    });

    return order;
  }
};
