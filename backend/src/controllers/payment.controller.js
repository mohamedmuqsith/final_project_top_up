import Stripe from "stripe";
import { ENV } from "../config/env.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { Cart } from "../models/cart.model.js";
import { createNotification, checkAndCreateInventoryNotifications } from "../services/notification.service.js";
import { getEffectivePrice } from "../services/pricing.service.js";

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY);

export async function createPaymentIntent(req, res) {
  try {
    const { cartItems, shippingAddress } = req.body;
    const user = req.user;

    // Validate cart items
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    // Calculate total from server-side (don't trust client - ever.)
    let subtotal = 0;
    const validatedItems = [];

    for (const item of cartItems) {
      const productId = item?.product?._id || item?.product;
      if (!productId) {
        return res.status(400).json({ error: "Invalid cart item: missing product" });
      }
      
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
      }

      // -- DISCOUNTS: calculate effective price server-side --
      const pricing = await getEffectivePrice(product);
      const effectivePrice = pricing.discountedPrice;

      subtotal += effectivePrice * item.quantity;
      validatedItems.push({
        product: product._id.toString(),
        name: product.name,
        price: effectivePrice, // Store the price paid
        quantity: item.quantity,
        image: product.images[0],
      });
    }

    const shipping = 10.0; // $10
    const tax = subtotal * 0.08; // 8%
    const total = subtotal + shipping + tax;

    if (total <= 0) {
      return res.status(400).json({ error: "Invalid order total" });
    }

    // 1. Create PENDING Order in DB (Source of Truth)
    const order = await Order.create({
      user: user._id,
      clerkId: user.clerkId,
      orderItems: validatedItems,
      shippingAddress,
      totalPrice: total,
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
    res.status(500).json({ error: "Failed to create payment intent" });
  }
}

/**
 * Shared logic to finalize an order after payment success.
 * Uses an atomic lock to ensure it only runs once per order ID.
 */
async function finalizeOrder(orderId, paymentIntent) {
  console.log(`[Payment] Attempting to finalize order ${orderId}...`);

  // 1. ATOMIC LOCK: Try to claim the "finalization" of this order
  // This prevents race conditions between webhook and confirm endpoint.
  const order = await Order.findOneAndUpdate(
    { _id: orderId, isFinalized: false },
    { $set: { isFinalized: true } },
    { new: true } // get the updated doc
  );

  if (!order) {
    console.log(`[Payment] Order ${orderId} already finalized or not found. Skipping.`);
    return null; 
  }

  try {
    console.log(`[Payment] Lock acquired for order ${orderId}. Processing status and stock...`);

    // 2. Finalize Order State
    order.status = "processing";
    order.paymentResult = {
      id: paymentIntent.id,
      status: "succeeded",
    };

    // 3. Record History
    order.statusHistory.push({
      status: "processing",
      timestamp: new Date(),
      comment: "Payment confirmed. Order finalized via atomic logic.",
      changedByType: "system"
    });

    await order.save();

    // 4. Reduce Stock once
    const productIds = [];
    for (const item of order.orderItems) {
      productIds.push(item.product);
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    console.log(`[Payment] Stock reduced for order ${orderId}. Sending notifications...`);

    // 5. Create Notifications exactly once
    // Customer
    await createNotification({
      recipientType: "customer",
      recipientId: order.user,
      title: "Order Placed Successfully",
      message: `Your order for $${order.totalPrice.toFixed(2)} has been placed. We're getting it ready!`,
      type: "ORDER_PLACED",
      entityId: order._id,
      entityModel: "Order",
    });

    // Admin
    await createNotification({
      recipientType: "admin",
      title: "New Order Received",
      message: `Business Alert: New order of $${order.totalPrice.toFixed(2)} received from ${order.shippingAddress?.fullName || 'a customer'}. (Order ID: ${order._id.toString().slice(-6).toUpperCase()})`,
      type: "NEW_ORDER",
      entityId: order._id,
      entityModel: "Order",
    });

    // 6. Inventory checks
    await checkAndCreateInventoryNotifications(productIds);

    console.log(`[Payment] Order ${orderId} finalized successfully.`);
    return order;
  } catch (error) {
    console.error(`[Payment] Critical error during finalization of order ${orderId}:`, error);
    throw error;
  }
}

export async function confirmPayment(req, res) {
  try {
    const { paymentIntentId, orderId } = req.body;
    const user = req.user;

    console.log(`[Payment] Manual confirmation requested for order ${orderId}`);

    if (!paymentIntentId || !orderId) {
      return res.status(400).json({ error: "Missing paymentIntentId or orderId" });
    }

    // 1. Verify PaymentIntent status via Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== "succeeded") {
      console.warn(`[Payment] PI ${paymentIntentId} not succeeded. Status: ${paymentIntent.status}`);
      return res.status(400).json({ error: `Payment not succeeded. Status: ${paymentIntent.status}` });
    }

    // 2. Strict metadata verification
    if (paymentIntent.metadata.orderId !== orderId) {
      console.error(`[Payment] Order ID mismatch. Expected ${orderId}, got ${paymentIntent.metadata.orderId}`);
      return res.status(400).json({ error: "Payment metadata mismatch (orderId)" });
    }
    
    if (paymentIntent.metadata.userId !== user._id.toString()) {
      console.error(`[Payment] User ID mismatch. Expected ${user._id}, got ${paymentIntent.metadata.userId}`);
      return res.status(403).json({ error: "Payment unauthorized for this user" });
    }

    // 3. Call shared finalization
    const finalized = await finalizeOrder(orderId, paymentIntent);

    if (!finalized) {
      console.log(`[Payment] PI ${paymentIntentId} already finalized by other process.`);
      return res.status(200).json({ message: "Order already processed", orderId });
    }

    res.status(200).json({ message: "Order confirmed successfully", orderId: finalized._id });
  } catch (error) {
    console.error(`[Payment] Error in confirmPayment for order ${req.body.orderId}:`, error);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
}

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
          paymentResult: { id: paymentIntent.id, status: "failed" }
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