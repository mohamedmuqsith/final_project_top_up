/**
 * Migration Script: Fix stale online orders with paymentStatus = "pending"
 * but paymentResult.status = "succeeded".
 *
 * Run: node src/scripts/fix-stale-payment-status.js
 */
import mongoose from "mongoose";
import { ENV } from "../config/env.js";
import { Order } from "../models/order.model.js";

async function fixStalePaymentStatuses() {
  try {
    await mongoose.connect(ENV.MONGO_URI);
    console.log("Connected to MongoDB.");

    // Find online orders where Stripe says succeeded but our paymentStatus is still pending
    const staleOrders = await Order.find({
      paymentMethod: "online",
      paymentStatus: "pending",
      "paymentResult.status": "succeeded",
    });

    console.log(`Found ${staleOrders.length} stale order(s) to fix.`);

    for (const order of staleOrders) {
      order.paymentStatus = "paid";
      order.statusHistory.push({
        status: order.status,
        timestamp: new Date(),
        comment: "Migration: paymentStatus corrected from pending to paid (Stripe confirmed succeeded).",
        changedByType: "system",
      });
      await order.save();
      console.log(`  Fixed order ${order._id} -> paymentStatus: paid`);
    }

    console.log("Migration complete.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

fixStalePaymentStatuses();
