import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";
import { createNotification } from "../services/notification.service.js";

export async function createOrder(req, res) {
  try {
    const user = req.user;
    const { orderItems, shippingAddress, paymentResult, totalPrice } = req.body;

    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ error: "No order items" });
    }

    // validate products and stock
    for (const item of orderItems) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        return res.status(404).json({ error: `Product ${item.name} not found` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }
    }

    const order = await Order.create({
      user: user._id,
      clerkId: user.clerkId,
      orderItems,
      shippingAddress,
      paymentResult,
      totalPrice,
    });

    // update product stock
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity },
      });
    }

    res.status(201).json({ message: "Order created successfully", order });
  } catch (error) {
    console.error("Error in createOrder controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserOrders(req, res) {
  try {
    const orders = await Order.find({ clerkId: req.user.clerkId })
      .populate("orderItems.product")
      .sort({ createdAt: -1 });

    // Get all reviews by this user, keyed by productId
    const userReviews = await Review.find({ userId: req.user._id });
    const reviewsByProduct = {};
    userReviews.forEach((review) => {
      if (review.productId) {
        reviewsByProduct[review.productId.toString()] = review;
      }
    });

    const ordersWithReviewStatus = orders.map((order) => {
      const orderObj = order.toObject();

      // Enrich each order item with review status
      orderObj.orderItems = orderObj.orderItems.map((item) => {
        const productId = item.product?._id?.toString() || item.product?.toString();
        const review = productId ? reviewsByProduct[productId] : null;
        return {
          ...item,
          hasReviewed: !!review,
          reviewId: review?._id || null,
        };
      });

      // Order-level hasReviewed: true only if ALL items reviewed AND order is delivered
      orderObj.hasReviewed =
        orderObj.status === "delivered" &&
        orderObj.orderItems.length > 0 &&
        orderObj.orderItems.every((item) => item.hasReviewed);

      return orderObj;
    });

    res.status(200).json({ orders: ordersWithReviewStatus });
  } catch (error) {
    console.error("Error in getUserOrders controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function requestOrderReturn(req, res) {
  try {
    const { id } = req.params;
    const { reason, comment } = req.body;

    if (!reason) {
      return res.status(400).json({ error: "Return reason is required" });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 1. Ownership validation
    if (order.clerkId !== req.user.clerkId) {
      return res.status(403).json({ error: "Unauthorized: You do not own this order" });
    }

    // 2. Status check
    if (order.status !== "delivered") {
      return res.status(400).json({ error: `Cannot return an order with status: ${order.status}` });
    }

    // 3. Finalized check (already refunded or denied)
    if (["refunded", "denied"].includes(order.returnStatus)) {
      return res.status(400).json({ error: "This order has already reached a final return state" });
    }

    // 4. Duplicate request check
    if (order.returnStatus === "requested") {
      return res.status(400).json({ error: "A return request is already pending for this order" });
    }

    // 5. Delivery date existence
    if (!order.deliveredAt) {
      return res.status(400).json({ error: "Order delivery date not recorded; please contact support" });
    }

    // 6. Return window check (14 days)
    const deliveredAt = new Date(order.deliveredAt);
    const now = new Date();
    const diffMs = now - deliveredAt;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 14) {
      return res.status(400).json({ error: "The 14-day return window for this order has expired" });
    }

    order.returnStatus = "requested";
    order.returnReason = reason;
    order.status = "return-requested";
    order.statusHistory.push({
      status: "return-requested",
      timestamp: new Date(),
      comment: comment || `Customer requested return. Reason: ${reason}`,
      changedBy: req.user._id,
      changedByType: "customer",
      source: "mobile-app"
    });

    await order.save();

    // Notify Admins
    await createNotification({
      recipientType: "admin",
      title: "New Return Request",
      message: `Customer ${req.user.name} requested a return for Order #${order._id.toString().slice(-6).toUpperCase()}.`,
      type: "RETURN_REQUESTED",
      entityId: order._id,
      entityModel: "Order",
      actionUrl: "/orders"
    });

    res.status(200).json({ 
      message: "Return requested successfully", 
      order 
    });
  } catch (error) {
    console.error("Error in requestOrderReturn:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}