import Stripe from "stripe";
import { ENV } from "../config/env.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { Cart } from "../models/cart.model.js";
import { createNotification, checkAndCreateInventoryNotifications } from "../services/notification.service.js";
import { getEffectivePrice } from "../services/pricing.service.js";

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY);

/**
 * Validates cart items, calculates totals, and prepares order items.
 * Centralized for consistent pricing and stock checks.
 */
const validateCartItems = async (cartItems) => {
  if (!cartItems || cartItems.length === 0) {
    throw new Error("Cart is empty");
  }

  let subtotal = 0;
  const validatedItems = [];

  for (const item of cartItems) {
    const productId = item?.product?._id || item?.product;
    if (!productId) {
      throw new Error("Invalid cart item: missing product");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Original stock check: ensure enough stock for the quantity requested
    if (product.stock < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    // SERVER-SIDE PRICING: calculate effective price
    const pricing = await getEffectivePrice(product);
    const effectivePrice = pricing.discountedPrice;

    subtotal += effectivePrice * item.quantity;
    validatedItems.push({
      product: product._id.toString(),
      name: product.name,
      price: effectivePrice,
      quantity: item.quantity,
      image: product.images[0],
    });
  }

  const shipping = 10.0;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax;

  if (total <= 0) {
    throw new Error("Invalid order total");
  }

  return { validatedItems, subtotal, shipping, tax, total };
};

export async function createPaymentIntent(req, res) {
  try {
    const { cartItems, shippingAddress } = req.body;
    const user = req.user;

    const { validatedItems, total } = await validateCartItems(cartItems);

    // 1. Create PENDING Order in DB (Source of Truth)
    const order = await Order.create({
      user: user._id,
      clerkId: user.clerkId,
      orderItems: validatedItems,
      shippingAddress,
      totalPrice: total,
      paymentMethod: "online",
      paymentStatus: "pending",
      status: "pending",
      paymentResult: {
        status: "pending",
      }
    });

    // find or create the stripe customer
    let customer;
    if (user.stripeCustomerId) {
      // find the customer
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      // create the customer
      customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
      });

      // add the stripe customer ID to the  user object in the DB
      await User.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id });
    }

    // create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // convert to cents
      currency: "usd",
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        orderId: order._id.toString(),
        userId: user._id.toString(),
        clerkId: user.clerkId,
        totalPrice: total.toFixed(2),
      },
      // in the webhooks section we will use this metadata
    });

    // Update order with payment intent ID for tracking
    order.paymentResult.id = paymentIntent.id;
    await order.save();

    res.status(200).json({ 
      clientSecret: paymentIntent.client_secret,
      orderId: order._id,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(error.status || 400).json({ 
      error: error.message || "Failed to create payment intent",
      message: error.message // Support both fields temporarily
    });
  }
}

/**
 * Shared logic to finalize an order after payment success.
 * Uses an atomic lock to ensure it only runs once per order ID.
 */
const finalizeOrder = async (orderId, paymentIntent) => {
  console.log(`[FinalizeOrder] Attempting to finalize order ${orderId}`);
  
  // Use findOneAndUpdate with isFinalized: false as an atomic lock
  const order = await Order.findOneAndUpdate(
    { _id: orderId, isFinalized: false },
    { 
      $set: { 
        isFinalized: true,
        status: "processing",
        paymentMethod: "online",
        paymentStatus: "paid",
        "paymentResult.id": paymentIntent.id,
        "paymentResult.status": paymentIntent.status
      } 
    },
    { new: true }
  );

  if (!order) {
    console.log(`[FinalizeOrder] Order ${orderId} already finalized or not found.`);
    return null;
  }

  // Stock reduction Logic
  for (const item of order.orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.quantity },
    });
  }

  // Record History
  order.statusHistory.push({
    status: "processing",
    timestamp: new Date(),
    comment: "Payment confirmed. Order finalized via atomic logic.",
    changedByType: "system"
  });
  await order.save();

  // Notifications
  await createNotification({
    recipientType: "customer",
    recipientId: order.user.toString(),
    title: "Order Placed Successfully",
    message: `Your order for $${order.totalPrice.toFixed(2)} has been placed. We're getting it ready!`,
    type: "ORDER_PLACED",
    entityId: order._id,
    entityModel: "Order",
  });

  await createNotification({
    recipientType: "admin",
    title: "New Online Order",
    message: `Payment confirmed for Order #${order._id.toString().slice(-6).toUpperCase()}.`,
    type: "NEW_ORDER",
    entityId: order._id,
    entityModel: "Order",
  });

  // Inventory checks
  const productIds = order.orderItems.map(item => item.product);
  await checkAndCreateInventoryNotifications(productIds);

  console.log(`[FinalizeOrder] Successfully finalized order ${orderId}`);
  return order;
};

// @desc    Confirm payment on server-side (Client-side fallback)
// @route   POST /api/payment/confirm
// @access  Private
export const confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    if (!orderId || !paymentIntentId) {
      return res.status(400).json({ error: "orderId and paymentIntentId are required" });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ error: `Payment Intent status: ${paymentIntent.status}` });
    }

    // Verify metadata
    if (paymentIntent.metadata.orderId !== orderId || paymentIntent.metadata.userId !== req.user._id.toString()) {
      return res.status(400).json({ error: "Invalid payment intent metadata" });
    }

    const order = await finalizeOrder(orderId, paymentIntent);

    if (order) {
      res.status(200).json({ message: "Order confirmed successfully", order });
    } else {
      res.status(200).json({ message: "Order already processed" });
    }
  } catch (error) {
    console.error("Error in confirmPayment:", error);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
};

// @desc    Create COD Order
// @route   POST /api/payment/cod-order
// @access  Private
export const createCodOrder = async (req, res) => {
  try {
    const { cartItems, shippingAddress } = req.body;

    const { validatedItems, total } = await validateCartItems(cartItems);

    // 2. Create Order (starts as Pending/Pending per refined rules)
    const order = await Order.create({
      user: req.user._id,
      clerkId: req.user.clerkId,
      orderItems: validatedItems,
      shippingAddress,
      totalPrice: total,
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "pending",
      isFinalized: true,
      statusHistory: [{
        status: "pending",
        timestamp: new Date(),
        comment: "Order placed using Cash on Delivery (COD).",
        changedByType: "system"
      }]
    });

    // 3. Update stock (Atomic Reservation)
    const productIds = [];
    for (const item of validatedItems) {
      productIds.push(item.product);
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // 4. Notifications
    await createNotification({
      recipientType: "customer",
      recipientId: req.user._id.toString(),
      title: "Order Placed (Cash on Delivery)",
      message: "Your COD order has been placed. Please have the amount ready at delivery.",
      type: "ORDER_PLACED",
      entityId: order._id,
      entityModel: "Order",
    });

    await createNotification({
      recipientType: "admin",
      title: "New COD Order",
      message: `A new COD order (#${order._id.toString().slice(-6).toUpperCase()}) was placed and is awaiting payment collection.`,
      type: "NEW_ORDER",
      entityId: order._id,
      entityModel: "Order",
    });

    // 5. Inventory checks
    await checkAndCreateInventoryNotifications(productIds);

    res.status(201).json({ message: "COD Order created successfully", order });
  } catch (error) {
    console.error("Error creating COD order:", error);
    res.status(error.status || 400).json({ 
      error: error.message || "Failed to place COD order",
      message: error.message
    });
  }
};

// @desc    Mark COD order as Paid (Admin only)
// @route   POST /api/payment/:orderId/mark-as-paid
// @access  Private/Admin
export const markAsPaid = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ error: "Order not found" });

    // Validation
    if (order.paymentMethod !== "cod") {
      return res.status(400).json({ error: "Only COD orders can be manually marked as paid" });
    }
    if (order.paymentStatus === "paid") {
      return res.status(400).json({ error: "Order is already marked as paid" });
    }
    if (["cancelled", "refunded"].includes(order.status)) {
      return res.status(400).json({ error: `Cannot mark ${order.status} order as paid` });
    }

    order.paymentStatus = "paid";
    order.statusHistory.push({
      status: order.status,
      timestamp: new Date(),
      comment: "Payment collected and marked as PAID by admin.",
      changedBy: req.user._id,
      changedByType: "admin"
    });

    await order.save();

    // Notify customer
    await createNotification({
      recipientType: "customer",
      recipientId: order.user.toString(),
      title: "Payment Confirmed",
      message: "Your payment for order #" + order._id.toString().slice(-6).toUpperCase() + " has been received.",
      type: "PAYMENT_CONFIRMED",
      entityId: order._id,
      entityModel: "Order",
    });

    res.status(200).json({ message: "Order marked as paid", order });
  } catch (error) {
    console.error("Error marking order as paid:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export async function handleWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, ENV.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    console.log(`[Webhook] Payment succeeded event: ${paymentIntent.id}`);

    try {
      const { orderId } = paymentIntent.metadata;
      if (orderId) {
        await finalizeOrder(orderId, paymentIntent);
      } else {
        console.error("[Webhook] Missing orderId in metadata for PI:", paymentIntent.id);
      }
    } catch (error) {
      console.error("[Webhook] Error processing successful payment:", error);
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    const { userId, orderId } = paymentIntent.metadata;
    console.log(`[Webhook] Payment failed event: ${paymentIntent.id}`);
    
    // Mark Order as Cancelled if it exists
    if (orderId) {
      try {
        await Order.findByIdAndUpdate(orderId, { 
          status: "cancelled",
          paymentStatus: "failed",
          "paymentResult.id": paymentIntent.id,
          "paymentResult.status": "failed"
        });
        console.log(`[Webhook] Order ${orderId} marked as cancelled.`);
      } catch (err) {
        console.error("Error cancelling order on payment failure:", err);
      }
    }

    // Notifications
    await createNotification({
      recipientType: "admin",
      title: "Payment Failed",
      message: `Operational Alert: A payment intent for $${(paymentIntent.amount / 100).toFixed(2)} just failed.`,
      type: "PAYMENT_FAILED",
      entityId: orderId || paymentIntent.id,
      entityModel: orderId ? "Order" : undefined
    });

    if (userId) {
      await createNotification({
        recipientType: "customer",
        recipientId: userId,
        title: "Payment Unsuccessful",
        message: "Your payment was not successful. Please check your payment method and try again.",
        type: "PAYMENT_FAILED",
        entityId: orderId || paymentIntent.id,
        entityModel: orderId ? "Order" : undefined
      });
    }
  }

  res.json({ received: true });
}