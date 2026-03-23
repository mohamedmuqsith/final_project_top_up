import mongoose from "mongoose";

export const ELECTRONICS_CATEGORIES = [
  "Smartphones",
  "Laptops",
  "Tablets",
  "Audio",
  "Headphones",
  "Speakers",
  "Gaming",
  "Accessories",
  "Smart Home",
  "Wearables",
  "Cameras",
  "Storage",
  "Networking",
  "Monitors",
  "Computer Components"
];

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      default: 10,
    },
    category: {
      type: String,
      required: true,
      enum: ELECTRONICS_CATEGORIES,
    },
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        publicId: {
          type: String,
          required: true,
        },
      },
    ],
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);