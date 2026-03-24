import mongoose from "mongoose";

const settingsSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: "SmartShop" },
    storeEmail: { type: String, default: "support@smartshop.lk" },
    storePhone: { type: String, default: "+94 11 123 4567" },
    storeAddress: {
      line1: { type: String, default: "123 Main Street" },
      line2: { type: String, default: "" },
      city: { type: String, default: "Colombo 03" },
      district: { type: String, default: "Colombo" },
      province: { type: String, default: "Western" },
      postalCode: { type: String, default: "00300" },
      country: { type: String, default: "Sri Lanka" },
    },
    localization: {
      currency: { type: String, default: "LKR" },
      currencySymbol: { type: String, default: "Rs." },
      timezone: { type: String, default: "Asia/Colombo" },
      language: { type: String, default: "English" },
    },
    shipping: {
      defaultFee: { type: Number, default: 350 },
      freeThreshold: { type: Number, default: 5000 },
      couriers: {
        type: [String],
        default: ["Domex", "Pronto", "Koombiyo", "Standard Delivery"],
      },
    },
    tax: {
      label: { type: String, default: "VAT" },
      rate: { type: Number, default: 15 }, // Percentage
      enabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const Settings = mongoose.model("Settings", settingsSchema);
