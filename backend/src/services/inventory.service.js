import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
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
    console.log(`[OrderService] Stock restoration completed for order ${order._id}`);
  },

  /**
   * Centralized engine to calculate sales velocity, stock alerts, and restock suggestions.
   * @param {Object} options - { lookbackDays, productIds }
   */
  async calculateStockPredictions({ lookbackDays = 30, productIds = [] } = {}) {
    const now = new Date();
    const lookbackDate = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    // 1. Aggregate valid sales (Paid OR Delivered)
    // We EXCLUDE cancelled, refunded, or failed orders for forecasting accuracy.
    const matchCriteria = {
      createdAt: { $gte: lookbackDate },
      $or: [
        { paymentStatus: "paid" },
        { status: "delivered" }
      ]
    };

    const velocityAgg = await Order.aggregate([
      { $match: matchCriteria },
      { $unwind: "$orderItems" },
      { 
        $group: { 
          _id: "$orderItems.product", 
          unitsSold: { $sum: "$orderItems.quantity" } 
        } 
      }
    ]);

    const velocityMap = new Map(velocityAgg.map(v => [v._id.toString(), v.unitsSold]));

    // 2. Fetch target products
    const query = productIds.length > 0 ? { _id: { $in: productIds } } : {};
    const products = await Product.find(query).select("name stock lowStockThreshold images category price createdAt");

    // 3. Enrich with business-safe metrics
    const results = products.map(product => {
      const unitsSold = velocityMap.get(product._id.toString()) || 0;
      
      // Calculate "Active Days" within window to handle new products correctly
      const productAgeMs = now - product.createdAt;
      const productAgeDays = Math.max(1, Math.min(lookbackDays, Math.ceil(productAgeMs / (1000 * 60 * 60 * 24))));
      
      const avgDailySales = unitsSold / productAgeDays;
      
      let daysRemaining = Infinity;
      if (avgDailySales > 0) {
        daysRemaining = Math.floor(product.stock / avgDailySales);
      }

      const threshold = product.lowStockThreshold || 10;
      let alertType = "Healthy";
      let severity = "Low";

      // Alert Logic
      if (product.stock <= 0) {
        alertType = "Out of Stock";
        severity = "Critical";
      } else if (product.stock <= threshold) {
        alertType = "Low Stock";
        severity = "High";
      } else if (daysRemaining <= 14) {
        alertType = "Predicted Stockout";
        severity = daysRemaining <= 7 ? "High" : "Medium";
      }

      // Restock Quantity Logic (Daraz-style: aim for 30-day safety stock)
      // Only suggest restock if product is actually selling OR critically low
      let suggestedRestockQty = 0;
      if (avgDailySales > 0 || product.stock <= threshold / 2) {
        // Targeted buffer: 30 days of sales
        const targetBuffer = Math.ceil(avgDailySales * 30);
        const minRestock = Math.max(10, threshold); // Minimum batch size
        
        suggestedRestockQty = Math.max(0, targetBuffer - product.stock);
        
        // If we suggest a restock, ensure it meets the minimum batch size
        if (suggestedRestockQty > 0 && suggestedRestockQty < minRestock) {
          suggestedRestockQty = minRestock;
        }

        // If dead stock but critically low, suggest a small baseline restock
        if (suggestedRestockQty === 0 && product.stock <= 0) {
          suggestedRestockQty = minRestock;
        }
      }

      const estimatedRestockCost = suggestedRestockQty * product.price;

      return {
        productId: product._id,
        name: product.name,
        image: product.images?.[0]?.url || product.images?.[0] || "/placeholder.jpg",
        category: product.category,
        currentStock: product.stock,
        lowStockThreshold: threshold,
        unitsSoldLookback: unitsSold,
        avgDailySales: parseFloat(avgDailySales.toFixed(2)),
        daysRemaining: daysRemaining === Infinity ? "N/A" : daysRemaining,
        alertType,
        severity,
        suggestedRestockQty,
        estimatedRestockCost: parseFloat(estimatedRestockCost.toFixed(2)),
        price: product.price
      };
    });

    return results;
  }
};
