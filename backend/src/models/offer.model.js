import mongoose from "mongoose";

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["percentage", "fixed"],
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    appliesTo: {
      type: String,
      required: true,
      enum: ["product", "category", "all"],
      default: "all",
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: function () {
        return this.appliesTo === "product";
      },
    },
    category: {
      type: String,
      required: function () {
        return this.appliesTo === "category";
      },
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    bannerText: {
      type: String,
      trim: true,
    },
    // Coupon/voucher support
    couponCode: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// index for better performance when searching for active offers
offerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

export const Offer = mongoose.model("Offer", offerSchema);
