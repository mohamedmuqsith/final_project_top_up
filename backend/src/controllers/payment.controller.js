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
        metadata: {
          clerkId: user.clerkId,
          userId: user._id.toString(),
        },
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
        clerkId: user.clerkId,
        userId: user._id.toString(),
        orderItems: JSON.stringify(validatedItems),
        shippingAddress: JSON.stringify(shippingAddress),
        totalPrice: total.toFixed(2),
      },
      // in the webhooks section we will use this metadata
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
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

    console.log("Payment succeeded:", paymentIntent.id);

    try {
      const { userId, clerkId, orderItems, shippingAddress, totalPrice } = paymentIntent.metadata;

      // Check if order already exists (prevent duplicates)
      const existingOrder = await Order.findOne({ "paymentResult.id": paymentIntent.id });
      if (existingOrder) {
        console.log("Order already exists for payment:", paymentIntent.id);
        return res.json({ received: true });
      }

      // create order
      const order = await Order.create({
        user: userId,
        clerkId,
        orderItems: JSON.parse(orderItems),
        shippingAddress: JSON.parse(shippingAddress),
        paymentResult: {
          id: paymentIntent.id,
          status: "succeeded",
        },
        totalPrice: parseFloat(totalPrice),
      });

      // update product stock
      const items = JSON.parse(orderItems);
      const productIds = [];
      for (const item of items) {
        productIds.push(item.product);
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity },
        });
      }

      // Fire role-specific notifications
      // 1. Customer: Order confirmation
      await createNotification({
        recipientType: "customer",
        recipientId: userId,
        title: "Order Placed Successfully",
        message: `Your order for $${parseFloat(totalPrice).toFixed(2)} has been placed. We're getting it ready!`,
        type: "ORDER_PLACED", // Use correct storefront type
        entityId: order._id,
        entityModel: "Order",
      });

      // 2. Admin: Operational alert
      await createNotification({
        recipientType: "admin",
        title: "New Order Received",
        message: `Business Alert: New order of $${parseFloat(totalPrice).toFixed(2)} received from ${shippingAddress?.fullName || 'a customer'}. (Order ID: ${order._id.toString().slice(-6).toUpperCase()})`,
        type: "NEW_ORDER",
        entityId: order._id,
        entityModel: "Order",
        actionUrl: "/orders"
      });

      // Run inventory dedup notification check on the purchased products
      await checkAndCreateInventoryNotifications(productIds);

      console.log("Order created successfully:", order._id);
    } catch (error) {
      console.error("Error creating order from webhook:", error);
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    const { userId } = paymentIntent.metadata;
    
    // 1. Alert the Admin
    await createNotification({
      recipientType: "admin",
      title: "Payment Failed",
      message: `Operational Alert: A payment intent for $${(paymentIntent.amount / 100).toFixed(2)} just failed.`,
      type: "PAYMENT_FAILED",
      entityId: paymentIntent.id
    });

    // 2. Alert the Customer (if possible)
    if (userId) {
      await createNotification({
        recipientType: "customer",
        recipientId: userId,
        title: "Payment Unsuccessful",
        message: "Your payment was not successful. Please check your payment method and try again.",
        type: "PAYMENT_FAILED", // Should be in allowed types if we want it to show
        entityId: paymentIntent.id
      });
    }
  }

  res.json({ received: true });
}