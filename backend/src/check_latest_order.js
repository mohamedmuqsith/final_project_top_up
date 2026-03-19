import mongoose from "mongoose";
import { ENV } from "./config/env.js";
import { Order } from "./models/order.model.js";

async function run() {
  try {
    await mongoose.connect(ENV.MONGODB_URI);
    const order = await Order.findOne().sort({ createdAt: -1 });
    console.log("Latest Order ID:", order._id);
    console.log("Status:", order.status);
    console.log("Payment Status:", order.paymentStatus);
    console.log("Return Status:", order.returnStatus);
    console.log("Status History:", JSON.stringify(order.statusHistory, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
