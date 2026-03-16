import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["published", "hidden", "flagged"],
      default: "published",
    },
  },
  { timestamps: true }
);

// One review per user per product — enforced at DB level
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Review = mongoose.model("Review", reviewSchema);