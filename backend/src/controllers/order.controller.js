import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Review } from "../models/review.model.js";

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
      reviewsByProduct[review.productId.toString()] = review;
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