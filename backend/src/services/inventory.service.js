import { Product } from "../models/product.model.js";
import { InventoryHistory } from "../models/inventoryHistory.model.js";

/**
 * Service to handle product inventory mutations.
 * Ensures stock consistency and provides idempotent restoration.
 */
export const InventoryService = {
  /**
   * Deducts stock for a list of order items.
   * @param {Array} items - Array of { product: id, quantity: number }
   */
  async deductStock(items) {
    console.log(`[InventoryService] Deducting stock for ${items.length} items`);
    for (const item of items) {
      const productId = item.product._id || item.product;
      const product = await Product.findById(productId);
      if (!product) {
        throw new Error(`Product ${productId} not found during stock deduction`);
      }

      const previousStock = product.stock;
      product.stock = Math.max(0, product.stock - item.quantity);
      await product.save();
      
      // Log Movement
      await InventoryHistory.create({
        product: productId,
        actionType: "purchase_deduction",
        quantityDelta: -item.quantity,
        previousStock,
        newStock: product.stock,
        reason: "Customer purchase",
        changedByType: "system"
      });
      
      console.log(`[InventoryService] Product ${product.name} stock reduced by ${item.quantity}. New stock: ${product.stock}`);
    }
  },

  /**
   * Restores stock for an order if it hasn't been restored already.
   * @param {Object} order - The Order document
   */
  async restoreStock(order) {
    if (order.isStockRestored) {
      console.log(`[InventoryService] Stock already restored for order ${order._id}. Skipping.`);
      return;
    }

    console.log(`[InventoryService] Restoring stock for order ${order._id}`);
    for (const item of order.orderItems) {
      const productId = item.product._id || item.product;
      const product = await Product.findById(productId);
      if (product) {
        const previousStock = product.stock;
        product.stock += item.quantity;
        await product.save();
        
        // Log Movement
        await InventoryHistory.create({
          product: productId,
          order: order._id,
          actionType: order.status === "cancelled" ? "cancellation_restock" : "return_restock",
          quantityDelta: item.quantity,
          previousStock,
          newStock: product.stock,
          reason: `Stock restored from ${order.status} order`,
          changedByType: "system"
        });
        
        console.log(`[InventoryService] Restored ${item.quantity} units for product ${item.name || productId}`);
      }
    }

    order.isStockRestored = true;
    await order.save();
    console.log(`[InventoryService] Stock restoration completed for order ${order._id}`);
  }
};
