import Stripe from "stripe";
import { ENV } from "../config/env.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { Cart } from "../models/cart.model.js";
import { createNotification, checkAndCreateInventoryNotifications } from "../services/notification.service.js";
import { getEffectivePrice, validateCartItems } from "../services/pricing.service.js";
import { OrderService } from "../services/order.service.js";

const stripe = new Stripe(ENV.STRIPE_SECRET_KEY);

/**
 * GET /api/payment/create-intent
 */
export async function createPaymentIntent(req, res) {
  try {
    const { cartItems, shippingAddress } = req.body;
    const user = req.user;

    // Ensure Sri Lankan address fields are properly mapped
    if (shippingAddress && !shippingAddress.postalCode && shippingAddress.zipCode) {
      shippingAddress.postalCode = shippingAddress.zipCode;
    }

    const { validatedItems, subtotal, shipping, tax, total, currency, currencySymbol } = await validateCartItems(cartItems);

    // 1. Create PENDING Order in DB (Source of Truth with Snapshot)
    const order = await Order.create({
      user: user._id,
      clerkId: user.clerkId,
      orderItems: validatedItems,
      shippingAddress,
      totalPrice: total,
      pricing: {
        subtotal,
        shippingFee: shipping,
        tax,
        total,
        currency: currency?.toLowerCase() || "lkr",
        currencySymbol: currencySymbol || "Rs."
      },
      paymentMethod: "online",
      paymentStatus: "pending",
      status: "pending",
      statusHistory: [{
        status: "pending",
        timestamp: new Date(),
        comment: "Order received. Awaiting payment/confirmation.",
        changedByType: "system"
      }],
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
      currency: currency?.toLowerCase() || "usd",
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

    // Update paymentResult fields first
    const order = await Order.findOneAndUpdate(
      { _id: orderId, isFinalized: false },
      { 
        $set: { 
          "paymentResult.id": paymentIntent.id,
          "paymentResult.status": paymentIntent.status
        } 
      },
      { new: true }
    );

    if (order) {
      // finalizeOrder sets paymentStatus = "paid" and saves
      const finalizedOrder = await OrderService.finalizeOrder(order, {
        paymentMethod: "online",
        paymentStatus: "paid",
        comment: "Payment confirmed via API. Order is now pending fulfillment."
      });
      // Return the FINALIZED order (after save), not the stale pre-save object
      res.status(200).json({ message: "Order confirmed successfully", order: finalizedOrder });
    } else {
      // Already finalized — fetch the latest state to return accurate data
      const existingOrder = await Order.findById(orderId);
      res.status(200).json({ message: "Order already processed", order: existingOrder });
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

    // Ensure Sri Lankan address fields are properly mapped
    if (shippingAddress && !shippingAddress.postalCode && shippingAddress.zipCode) {
      shippingAddress.postalCode = shippingAddress.zipCode;
    }

    const { validatedItems, subtotal, shipping, tax, total } = await validateCartItems(cartItems);

    // 2. Create Order (starts as Pending/Pending per refined rules)
    const order = await Order.create({
      user: req.user._id,
      clerkId: req.user.clerkId,
      orderItems: validatedItems,
      shippingAddress,
      totalPrice: total,
      pricing: {
        subtotal,
        shippingFee: shipping,
        tax,
        total,
        currency: "usd"
      },
      paymentMethod: "cod",
      paymentStatus: "pending",
      status: "pending",
      statusHistory: [{
        status: "pending",
        timestamp: new Date(),
        comment: "Order placed using Cash on Delivery (COD). Currently pending.",
        changedByType: "system"
      }]
    });

    // Simplified via OrderService.finalizeOrder
    await OrderService.finalizeOrder(order, {
      paymentMethod: "cod",
      paymentStatus: "pending",
      comment: "Order placed using Cash on Delivery (COD). Currently pending."
    });

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
    if (order.status === "cancelled" || order.paymentStatus === "refunded") {
      return res.status(400).json({ error: `Cannot mark this order as paid (status: ${order.status}, payment: ${order.paymentStatus})` });
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

    // Notify customer using standardized enum PAYMENT_CONFIRMED
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
        // Find and finalize using OrderService
        const order = await Order.findOneAndUpdate(
          { _id: orderId, isFinalized: false },
          { 
            $set: { 
              "paymentResult.id": paymentIntent.id,
              "paymentResult.status": paymentIntent.status
            } 
          },
          { new: true }
        );
        if (order) {
          await OrderService.finalizeOrder(order, {
            paymentMethod: "online",
            paymentStatus: "paid",
            comment: "Payment confirmed via Stripe Webhook."
          });
        }
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
    
    // Mark Order as Cancelled and RESTORE STOCK via OrderService
    if (orderId) {
      try {
        const order = await Order.findById(orderId);
        if (order) {
          await OrderService.cancelOrder(order, {
            actorType: "system",
            comment: "Order cancelled automatically due to failed payment."
          });
          console.log(`[Webhook] Order ${orderId} cancelled and stock restored.`);
        }
      } catch (err) {
        console.error("Error cancelling order on payment failure:", err);
      }
    }

    // Notifications
    await createNotification({
      recipientType: "admin",
      title: "Payment Failed",
      message: `Operational Alert: A payment intent for ${(paymentIntent.amount / 100).toFixed(2)} just failed.`,
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