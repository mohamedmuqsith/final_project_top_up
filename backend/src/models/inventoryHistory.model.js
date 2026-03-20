import mongoose from "mongoose";

const inventoryHistorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: false,
    },
    actionType: {
      type: String,
      enum: ["purchase_deduction", "cancellation_restock", "return_restock", "manual_adjustment"],
      required: true,
    },
    quantityDelta: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    changedByType: {
      type: String,
      enum: ["admin", "system", "customer"],
      required: true,
    },
  },
  { timestamps: true }
);

export const InventoryHistory = mongoose.model("InventoryHistory", inventoryHistorySchema);
