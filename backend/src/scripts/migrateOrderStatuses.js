import mongoose from "mongoose";
import dotenv from "dotenv";
import { Order } from "../models/order.model.js";

dotenv.config();

const migrateOrderStatuses = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    const orders = await Order.find({});
    let migratedCount = 0;

    for (const order of orders) {
      let needsSave = false;
      const oldStatus = order.status;
      const oldReturnStatus = order.returnStatus;
      
      // 1. Safe Processing Reversion: Revert auto-created 'processing' to 'pending'
      // If order is processing, and it was created very recently, or only has 1 history entry which says 'processing' or 'received', it's likely fake processing.
      // But to be completely safe and follow rule 2: "Only revert orders that were incorrectly auto-created as processing and never genuinely entered fulfillment."
      // If shippedAt exists, it is definitely fulfilled. If history shows a manual admin change to processing, it's genuine.
      if (oldStatus === "processing") {
          const hasManualFulfillment = order.statusHistory.some(h => h.changedByType === "admin" && h.status === "processing");
          if (!hasManualFulfillment && !order.shippedAt) {
              order.status = "pending";
              needsSave = true;
          }
      }

      // 2. Separate returns and refunds from main status
      if (["return-requested", "approved", "denied", "refunded"].includes(oldStatus)) {
        needsSave = true;
        
        // Recover original logistics status
        // Since these are return states, the order must have been delivered (unless cancelled before shipment but still refunded)
        const wasCancelledBeforeDelivery = order.statusHistory.some(h => h.status === "cancelled");
        
        if (wasCancelledBeforeDelivery) {
            order.status = "cancelled";
        } else {
            // Default to delivered if it had a return state
            order.status = "delivered";
        }

        if (oldStatus === "return-requested") {
            order.returnStatus = "requested";
        } else if (oldStatus === "approved") {
            order.returnStatus = "approved";
        } else if (oldStatus === "denied") {
            order.returnStatus = "denied";
        } else if (oldStatus === "refunded") {
            // Refunded could have been from a return OR a cancellation
            order.paymentStatus = "refunded";
            if (oldReturnStatus === "approved" || !wasCancelledBeforeDelivery) {
                 order.returnStatus = "approved"; // Assume it was approved if it was delivered and then refunded
            }
        }
      }

      // 3. Fix any legacy returnStatus fields that had "refunded"
      if (order.returnStatus === "refunded") {
           order.returnStatus = "approved";
           order.paymentStatus = "refunded";
           needsSave = true;
      }

      // 4. Clean up statusHistory to map old statuses to new valid ones?
      // Keeping history intact is better for auditing, but we could normalize 'return-requested' -> 'delivered'.
      // The instructions say: "Preserve original logistics status where possible". Safe to leave history unmodified for historical accuracy, 
      // or just ensure the current state is valid.

      if (needsSave) {
        // Bypass validation temporarily to save migrated data if strict enum kicks in before everything aligns
        await order.save({ validateBeforeSave: false });
        migratedCount++;
        console.log(`Migrated order ${order._id} - Old Status: ${oldStatus} -> New Status: ${order.status}, Return: ${order.returnStatus}, Payment: ${order.paymentStatus}`);
      }
    }

    console.log(`Migration complete. Migrated ${migratedCount} out of ${orders.length} orders.`);
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrateOrderStatuses();
