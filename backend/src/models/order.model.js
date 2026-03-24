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
  addressLine2: {
    type: String,
    default: "",
  },
  city: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  province: {
    type: String,
    required: true,
  },
  postalCode: {
    type: String,
    required: true,
  },
  phoneNumber: {
    type: String,
    required: true,
  },
}, { toJSON: { virtuals: true }, toObject: { virtuals: true } });

shippingAddressSchema.virtual("zipCode").get(function() {
  return this.postalCode;
}).set(function(val) {
  this.postalCode = val;
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
      originalSubtotal: { type: Number, min: 0 },
      discountAmount: { type: Number, default: 0, min: 0 },
      shippingFee: { type: Number, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
      total: { type: Number, min: 0 },
      savings: { type: Number, default: 0 },
      netAmount: { type: Number },
      vatRate: { type: Number, default: 15 },
      extractedVat: { type: Number },
      taxIncluded: { type: Boolean, default: true },
      currency: { type: String, default: "LKR" },
      currencySymbol: { type: String, default: "Rs." },
      appliedCoupon: {
        code: String,
        title: String,
        discountType: String,
        value: Number,
        discountGiven: Number,
      },
      appliedOffers: [{
        offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer" },
        title: String,
        type: { type: String },
        value: Number,
        scope: String,
      }],
      // Legacy compatibility
      taxAmount: { type: Number },
      totalAmount: { type: Number },
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
      internalTrackingNumber: { type: String, unique: true, sparse: true },
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
  if (!doc.pricing) {
    doc.pricing = { subtotal: 0, shippingFee: 0, total: 0 };
  }

  // Support legacy fields
  const subtotal = doc.pricing.subtotal || doc.get("pricing.subtotal") || 0;
  const shipping = doc.pricing.shippingFee || doc.get("pricing.shippingFee") || doc.get("pricing.shipping") || 0;
  const total = doc.pricing.total || doc.get("pricing.total") || doc.pricing.totalAmount || doc.totalPrice || 0;

  // Standardization
  doc.pricing.subtotal = subtotal;
  doc.pricing.shippingFee = shipping;
  doc.pricing.total = total;
  doc.pricing.currency = "LKR";
  doc.pricing.currencySymbol = "Rs.";

  // Tax-Inclusive Logic (15% extraction)
  doc.pricing.taxIncluded = true;
  doc.pricing.vatRate = doc.pricing.vatRate || doc.pricing.taxRate || 15;
  const rate = doc.pricing.vatRate;
  
  if (!doc.pricing.extractedVat || doc.pricing.extractedVat === 0) {
    doc.pricing.extractedVat = subtotal * (rate / (100 + rate));
  }
  if (!doc.pricing.netAmount || doc.pricing.netAmount === 0) {
    doc.pricing.netAmount = subtotal - (doc.pricing.extractedVat || 0);
  }
});

orderSchema.set("toJSON", { virtuals: true });
orderSchema.set("toObject", { virtuals: true });

// Fix duplicate key error: allow multiple null/missing IDs for COD orders
orderSchema.index({ "paymentResult.id": 1 }, { unique: true, sparse: true });

export const Order = mongoose.model("Order", orderSchema);