import { Order } from "../../models/order.model.js";
import { OrderService } from "../../services/order.service.js";
import { InventoryService } from "../../services/inventory.service.js";
import { createNotification } from "../../services/notification.service.js";

// @desc    Get order by ID for admin (full details)
// @route   GET /api/admin/orders/:id
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email imageUrl")
      .populate("orderItems.product", "name images price stock lowStockThreshold");

    if (!order) return res.status(404).json({ error: "Order not found" });

    res.status(200).json(order);
  } catch (error) {
    console.error("Error in getOrderById:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get all orders for admin
// @route   GET /api/admin/orders
export const getAllOrders = async (req, res) => {
  try {
    const { status, startDate, endDate, minPrice, maxPrice } = req.query;
    let query = {};

    if (status && status !== "All") {
      if (["return-requested", "approved", "denied"].includes(status)) {
        query.returnStatus = status === "return-requested" ? "requested" : status;
      } else if (status === "refunded") {
        query.paymentStatus = "refunded";
      } else {
        query.status = status;
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (minPrice || maxPrice) {
      query.totalPrice = {};
      if (minPrice) query.totalPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.totalPrice.$lte = parseFloat(maxPrice);
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Generates a unique internal tracking number: SS-{CODE}-{YYYYMMDD}-{SEQUENCE}
 * @param {string} courierName 
 * @returns {Promise<string>}
 */
const generateInternalTrackingNumber = async (courierName) => {
  const code = (courierName || "GEN").slice(0, 3).toUpperCase().padEnd(3, "X");
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  
  // Get count of orders with an internal tracking number generated today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  
  const count = await Order.countDocuments({
    "shippingDetails.shippedAt": { $gte: todayStart }
  });
  
  const sequence = (count + 1).toString().padStart(6, "0");
  return `SS-${code}-${date}-${sequence}`;
};

// @desc    Update order status
// @route   PATCH /api/admin/orders/:orderId/status
export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status: newStatus, comment: adminComment, cashCollected } = req.body;
    const adminId = req.user?._id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const currentStatus = order.status;

    // Use OrderService for cancellation
    if (newStatus === "cancelled") {
      await OrderService.cancelOrder(order, {
        actorId: adminId,
        actorType: "admin",
        comment: adminComment || "Order cancelled by administrator."
      });
    } else {
      // Validate transition using OrderService
      if (currentStatus !== newStatus) {
        OrderService.validateStatusTransition(currentStatus, newStatus);
      } else {
        return res.status(200).json(order);
      }

      order.status = newStatus;
      
      // Fulfillment Logic for Shipped/Delivered
      if (newStatus === "shipped") {
        const courier = (req.body.courierName || "").trim();
        const tracking = (req.body.trackingNumber || "").trim(); // Courier tracking (optional)
        const { estimatedDeliveryDate, method } = req.body;

        if (!courier) {
          return res.status(400).json({ error: "Courier Name is required for shipping." });
        }

        // 1. Generate Internal Tracking Number
        const internalTracking = await generateInternalTrackingNumber(courier);

        // 2. Validate Courier Tracking (ONLY IF PROVIDED)
        if (tracking) {
          const existingTracking = await Order.findOne({ 
            "shippingDetails.trackingNumber": tracking,
            _id: { $ne: orderId } 
          });
          
          if (existingTracking) {
            return res.status(400).json({ error: "Courier tracking number already exists in another order" });
          }

          const fallbackRegex = /^[A-Za-z0-9-]{8,30}$/;
          if (!fallbackRegex.test(tracking)) {
            return res.status(400).json({ 
              error: `Invalid courier tracking format. Expected 8-30 characters.` 
            });
          }
        }

        order.shippingDetails = {
          ...order.shippingDetails,
          courierName: courier,
          trackingNumber: tracking || undefined, // Truly optional
          internalTrackingNumber: internalTracking,
          estimatedDeliveryDate: estimatedDeliveryDate ? new Date(estimatedDeliveryDate) : order.shippingDetails?.estimatedDeliveryDate,
          method: method || order.shippingDetails?.method || "standard",
          shippedAt: new Date()
        };
        order.shippedAt = order.shippingDetails.shippedAt; 
      }

      if (newStatus === "delivered") {
        // COD Delivery Logic: Confirm payment collection
        if (order.paymentMethod === "cod") {
          if (cashCollected === true) {
            order.paymentStatus = "paid";
          } else if (cashCollected === false) {
            order.paymentStatus = "pending";
          }
        }
        
        order.shippingDetails.deliveredAt = new Date();
        order.deliveredAt = order.shippingDetails.deliveredAt;
      }
      
      const statusComment = adminComment || (
        newStatus === "processing"
          ? "Order is being prepared for shipment."
          : newStatus === "shipped" 
            ? `Order shipped via ${order.shippingDetails.courierName}. (Ref: ${order.shippingDetails.internalTrackingNumber}${order.shippingDetails.trackingNumber ? ` | Courier TRK: ${order.shippingDetails.trackingNumber}` : ""})`
            : newStatus === "delivered"
              ? order.paymentMethod === "cod"
                ? `Order delivered successfully. Cash collected: ${cashCollected === true ? "YES" : "NO"}`
                : "Order delivered successfully."
              : `Status updated to ${newStatus} via Admin Panel`
      );

      order.statusHistory.push({
        status: newStatus,
        oldStatus: currentStatus,
        timestamp: new Date(),
        comment: statusComment,
        changedBy: adminId,
        changedByType: "admin"
      });

      await order.save();

      // Notifications
      const notificationMap = {
        processing: { title: "Order Processing", message: "Your order is now being prepared.", type: "ORDER_PROCESSING" },
        shipped: { title: "Order Shipped", message: "Your order has been shipped and is on its way!", type: "ORDER_SHIPPED" },
        delivered: { title: "Order Delivered", message: "Your order has been delivered. Enjoy your purchase!", type: "ORDER_DELIVERED" }
      };

      if (notificationMap[newStatus]) {
        const n = notificationMap[newStatus];
        await createNotification({
          recipientType: "customer",
          recipientId: order.user.toString(),
          title: n.title,
          message: n.message,
          type: n.type,
          entityId: order._id,
          entityModel: "Order",
        });
      }
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error in updateOrderStatus:", error);
    res.status(error.message.includes("Invalid status") ? 400 : 500).json({ error: error.message || "Internal server error" });
  }
};

// @desc    Handle return request (Approve/Deny)
// @route   PATCH /api/admin/orders/:orderId/return
export const handleReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action, adminComment } = req.body; // action: 'approve' or 'deny'

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.returnStatus !== "requested") {
      return res.status(400).json({ error: "No active return request for this order" });
    }

    if (action === "approve") {
      order.returnStatus = "approved";
      // order.status remains "delivered" or its current valid state per schema enums.
      // Return workflow is tracked via returnStatus.
      
      // Restore stock when return is approved (items are back)
      await InventoryService.restoreStock(order);
    } else if (action === "deny") {
      order.returnStatus = "denied";
    } else {
      return res.status(400).json({ error: "Invalid action. Use 'approve' or 'deny'." });
    }

    order.returnNotes = adminComment;
    
    order.statusHistory.push({
      status: order.status,
      oldStatus: "delivered",
      timestamp: new Date(),
      comment: adminComment || `Return request ${action}ed by admin.`,
      changedByType: "admin"
    });

    await order.save();

    await createNotification({
      recipientType: "customer",
      recipientId: order.user.toString(),
      title: `Return Request ${action.toUpperCase()}ED`,
      message: `Your return request for order #${order._id.toString().slice(-6).toUpperCase()} has been ${action}ed.`,
      type: action === "approve" ? "RETURN_APPROVED" : "RETURN_DENIED",
      entityId: order._id,
      entityModel: "Order",
    });

    res.status(200).json(order);
  } catch (error) {
    console.error("Error in handleReturnRequest:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Process refund safely
// @route   POST /api/admin/orders/:orderId/refund
export const processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason = "" } = req.body || {};
    const adminId = req.user?._id;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    await OrderService.processRefund(order, {
      actorId: adminId,
      actorType: "admin",
      reason: reason || "Refund processed by administrator."
    });

    res.status(200).json({ message: "Refund processed successfully", order });
  } catch (error) {
    console.error("Error in processRefund:", error);
    res.status(400).json({ error: error.message || "Internal server error" });
  }
};
