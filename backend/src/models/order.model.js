import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  image: {
    type: String,
    required: true,
  },
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
  },
  streetAddress: {
    type: String,
    required: true,
  },
  city: {
    type: String,
    required: true,
  },
  province: {
    type: String,
    required: true,
  },
  zipCode: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    clerkId: {
      type: String,
      required: true,
    },
      orderItems: [orderItemSchema],
      shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    paymentResult: {
      id: String,
      status: String,
    },
    paymentMethod: {
      type: String,
      enum: ["online", "cod"],
      default: "online",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    statusHistory: [
      {
        status: String,
        oldStatus: String,
        timestamp: { type: Date, default: Date.now },
        comment: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        changedByType: { type: String, enum: ["customer", "admin", "system"] },
      },
    ],
    deliveredAt: {
      type: Date,
    },
    shippedAt: {
      type: Date,
    },
    returnReason: {
      type: String,
    },
    returnStatus: {
      type: String,
      enum: ["none", "requested", "approved", "denied"],
      default: "none",
    },
    returnNotes: {
      type: String,
    },
    isFinalized: {
      type: Boolean,
      default: false,
    },
    isStockRestored: {
      type: Boolean,
      default: false,
    },
    pricing: {
      subtotal: { type: Number, min: 0 },
      shippingFee: { type: Number, min: 0 },
      tax: { type: Number, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      total: { type: Number, min: 0 },
      currency: { type: String, default: "usd" },
    },
    shippingDetails: {
      method: { 
        type: String, 
        enum: ["standard", "express", "same-day", "pickup", "none"],
        default: "standard"
      },
      courierName: { type: String },
      trackingNumber: { type: String },
      trackingUrl: { type: String },
      estimatedDeliveryDate: { type: Date },
      shippedAt: { type: Date },
      deliveredAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Backward compatibility alias: order.delivery -> order.shippingDetails
orderSchema.virtual("delivery").get(function() {
  return this.shippingDetails;
}).set(function(val) {
  this.shippingDetails = val;
});

orderSchema.post("init", function(doc) {
  if (!doc.pricing || !doc.pricing.total) {
    const subtotal = doc.orderItems?.reduce((s, i) => s + (i.price * i.quantity), 0) || 0;
    doc.pricing = {
      subtotal: subtotal,
      shippingFee: 0, // Fallback for legacy
      tax: 0,         // Fallback for legacy
      discount: 0,
      total: doc.totalPrice || subtotal,
      currency: "usd",
      isLegacy: true
    };
  }
});

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

// Fix duplicate key error: allow multiple null/missing IDs for COD orders
orderSchema.index({ "paymentResult.id": 1 }, { unique: true, sparse: true });

export const Order = mongoose.model("Order", orderSchema);