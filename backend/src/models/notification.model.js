import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
    },
    // Required if recipientType === "customer", otherwise optional (for broadcast admin alerts)
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "ORDER_PLACED",
        "NEW_ORDER",
        "ORDER_PROCESSING",
        "ORDER_SHIPPED",
        "ORDER_DELIVERED",
        "ORDER_CANCELLED",
        "RETURN_REQUESTED",
        "RETURN_APPROVED",
        "RETURN_DENIED",
        "REFUND_COMPLETED",
        "ORDER_REFUNDED",
        "LOW_STOCK",
        "OUT_OF_STOCK",
        "PREDICTED_STOCKOUT",
        "PAYMENT_CONFIRMED",
        "PAYMENT_FAILED",
        "NEW_REVIEW"
      ],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      // This could point to Product, Order, etc.
    },
    entityModel: {
      type: String,
      enum: ["Product", "Order"],
    },
    actionUrl: {
      type: String, 
      // Optional deep link string generated securely on the backend
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index to quickly fetch user notifications or active inventory alerts
notificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });
notificationSchema.index({ type: 1, entityId: 1, isResolved: 1 });

export const Notification = mongoose.model("Notification", notificationSchema);
