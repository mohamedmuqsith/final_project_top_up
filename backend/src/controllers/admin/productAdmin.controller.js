import { Product } from "../../models/product.model.js";
import { Order } from "../../models/order.model.js";
import cloudinary from "../../config/cloudinary.js";
import { checkAndCreateInventoryNotifications } from "../../services/notification.service.js";
import { InventoryHistory } from "../../models/inventoryHistory.model.js";

// @desc    Create a product
// @route   POST /api/admin/products
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, lowStockThreshold, color, size, brand, isFeatured, discountPrice } = req.body;
    
    // Process images
    let images = [];
    if (req.files && req.files.length > 0) {
      // req.files.path is the URL, req.files.filename is the publicId (provided by multer-storage-cloudinary)
      images = req.files.map(file => ({
        url: file.path,
        publicId: file.filename
      }));
      
      // Enforce 3-image limit
      if (images.length > 3) {
        images = images.slice(0, 3);
      }
    }

    const product = await Product.create({
      name,
      description,
      price,
      category,
      stock: stock || 0,
      lowStockThreshold: lowStockThreshold || 10,
      images,
      color,
      size,
      brand,
      isFeatured: isFeatured === "true" || isFeatured === true,
      discountPrice
    });

    // Log Initial Inventory
    if (product.stock > 0) {
      await InventoryHistory.create({
        product: product._id,
        actionType: "manual_adjustment",
        quantityDelta: product.stock,
        previousStock: 0,
        newStock: product.stock,
        reason: "Initial stock on product creation",
        changedBy: req.user?._id,
        changedByType: "admin"
      });
    }

    res.status(201).json(product);
  } catch (error) {
    console.error("Error in createProduct:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Update a product
// @route   PUT /api/admin/products/:id
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Handle status / boolean conversions
    if (updateData.isFeatured !== undefined) updateData.isFeatured = updateData.isFeatured === "true" || updateData.isFeatured === true;
    if (updateData.stock !== undefined) updateData.stock = Number(updateData.stock);

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // ── Image Management Logic ──
    let currentImages = [];
    
    // 1. Get existing images the user wants to keep
    if (req.body.existingImages) {
      try {
        currentImages = typeof req.body.existingImages === "string" 
          ? JSON.parse(req.body.existingImages) 
          : req.body.existingImages;
          
        // Ensure they are normalized to objects if they were strings (migration safety)
        currentImages = currentImages.map(img => 
          typeof img === "string" ? { url: img, publicId: "unknown" } : img
        );
      } catch (e) {
        console.error("Error parsing existingImages:", e);
        currentImages = product.images || [];
      }
    } else {
      currentImages = product.images || [];
    }

    // 2. Add new uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => ({
        url: f.path,
        publicId: f.filename
      }));
      currentImages = [...currentImages, ...newImages];
    }

    // 3. Enforce strict 3-image limit
    if (currentImages.length > 3) {
      currentImages = currentImages.slice(0, 3);
    }
    
    updateData.images = currentImages;

    const oldStock = product.stock;
    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    // Log Manual Adjustment if stock changed
    if (updateData.stock !== undefined && updateData.stock !== oldStock) {
      await InventoryHistory.create({
        product: updatedProduct._id,
        actionType: "manual_adjustment",
        quantityDelta: updatedProduct.stock - oldStock,
        previousStock: oldStock,
        newStock: updatedProduct.stock,
        reason: "Manual stock adjustment via Admin Panel",
        changedBy: req.user?._id,
        changedByType: "admin"
      });

      // Check for low stock after update
      await checkAndCreateInventoryNotifications([id]);
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error in updateProduct:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Delete a product
// @route   DELETE /api/admin/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        if (image.publicId && image.publicId !== "unknown") {
          await cloudinary.uploader.destroy(image.publicId);
        } else if (image.url) {
          // Fallback parsing for legacy string-based assets
          const publicId = image.url.split("/").pop().split(".")[0];
          await cloudinary.uploader.destroy(`products/${publicId}`);
        }
      }
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error in deleteProduct:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get all products for admin (with full details)
// @route   GET /api/admin/products
export const getAllProducts = async (req, res) => {
  try {
    const { category, stockStatus, minPrice, maxPrice, search } = req.query;
    let query = {};

    if (category && category !== "All") query.category = category;

    if (stockStatus && stockStatus !== "all") {
      if (stockStatus === "in-stock") query.$expr = { $gt: ["$stock", "$lowStockThreshold"] };
      if (stockStatus === "low-stock") query.$expr = { $and: [{ $gt: ["$stock", 0] }, { $lte: ["$stock", "$lowStockThreshold"] }] };
      if (stockStatus === "out-of-stock") query.stock = { $lte: 0 };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });
    res.status(200).json(products);
  } catch (error) {
    console.error("Error in getAllProducts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get inventory history for a product or all
// @route   GET /api/admin/products/:id/history
export const getInventoryHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const query = id === "all" ? {} : { product: id };
    
    const history = await InventoryHistory.find(query)
      .populate("product", "name images")
      .populate("changedBy", "name")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.status(200).json(history);
  } catch (error) {
    console.error("Error in getInventoryHistory:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get inventory alerts (using per-product threshold)
// @route   GET /api/admin/alerts
export const getInventoryAlerts = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Calculate sales velocity from last 30 days (paid, non-cancelled)
    // Using correct orderItem field: product (from Phase 9 fix)
    const velocityAgg = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: thirtyDaysAgo }, 
          status: { $ne: "cancelled" }
        } 
      },
      { $unwind: "$orderItems" },
      { 
        $group: { 
          _id: "$orderItems.product", 
          unitsSold: { $sum: "$orderItems.quantity" } 
        } 
      }
    ]);

    const velocityMap = new Map(velocityAgg.map(v => [v._id.toString(), v.unitsSold]));

    // 2. Fetch products that are either objectively low stock OR have sales
    // We fetch all products with stock <= threshold OR velocity > 0 to check predictions
    const products = await Product.find({
      $or: [
        { $expr: { $lte: ["$stock", "$lowStockThreshold"] } },
        { _id: { $in: Array.from(velocityMap.keys()) } }
      ]
    }).select("name stock lowStockThreshold images category");

    // 3. Normalize and enrich alerts
    const alerts = products.map(product => {
      const unitsSold30d = velocityMap.get(product._id.toString()) || 0;
      const avgDailySales = unitsSold30d / 30;
      
      let daysRemaining = Infinity;
      if (avgDailySales > 0) {
        daysRemaining = Math.floor(product.stock / avgDailySales);
      }

      const threshold = product.lowStockThreshold || 10;
      let type = "";
      let severity = "";

      // Logic: Out of Stock (0) > Low Stock (<= threshold) > Predicted Stockout (velocity indicates depletion)
      if (product.stock <= 0) {
        type = "Out of Stock";
        severity = "Critical";
      } else if (product.stock <= threshold) {
        type = "Low Stock";
        severity = "High";
      } else if (daysRemaining <= 14) {
        type = "Predicted Stockout";
        severity = daysRemaining <= 7 ? "High" : "Medium";
      } else {
        // Not actually an alert if stock is high and velocity is low
        return null;
      }

      return {
        _id: `alert-${product._id}`, // unique id for frontend
        productId: product._id,
        productName: product.name,
        image: product.images?.[0]?.url || product.images?.[0] || "/placeholder.jpg",
        type,
        severity,
        currentStock: product.stock,
        threshold,
        avgDailySales: parseFloat(avgDailySales.toFixed(2)),
        daysRemaining: daysRemaining === Infinity ? "N/A" : daysRemaining,
        category: product.category
      };
    }).filter(a => a !== null);

    // Sort: Critical first, then High, then Medium
    const severityOrder = { "Critical": 0, "High": 1, "Medium": 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.status(200).json(alerts);
  } catch (error) {
    console.error("Error in getInventoryAlerts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get restock suggestions (using predictive velocity)
// @route   GET /api/admin/restock-suggestions
export const getRestockSuggestions = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Calculate sales velocity (paid, non-cancelled)
    // Using correct orderItem field: product (from Phase 9 fix)
    const velocityAgg = await Order.aggregate([
      { 
        $match: { 
          createdAt: { $gte: thirtyDaysAgo }, 
          status: { $ne: "cancelled" }
        } 
      },
      { $unwind: "$orderItems" },
      { 
        $group: { 
          _id: "$orderItems.product", 
          unitsSold: { $sum: "$orderItems.quantity" } 
        } 
      }
    ]);

    const velocityMap = new Map(velocityAgg.map(v => [v._id.toString(), v.unitsSold]));

    // 2. Fetch products that might need restocking 
    // (stock <= lowStockThreshold OR high velocity products)
    const products = await Product.find({
      $or: [
        { $expr: { $lte: ["$stock", "$lowStockThreshold"] } },
        { _id: { $in: Array.from(velocityMap.keys()) } }
      ]
    }).select("name stock lowStockThreshold images category price");

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let totalEstimatedCost = 0;

    const suggestions = products.map(product => {
      const unitsSold30d = velocityMap.get(product._id.toString()) || 0;
      const avgDailySales = unitsSold30d / 30;
      
      let daysRemaining = Infinity;
      if (avgDailySales > 0) {
        daysRemaining = Math.floor(product.stock / avgDailySales);
      }

      const threshold = product.lowStockThreshold || 10;
      let priority = "";

      // Priority Logic: Critical (0 stock or <= 3 days) > High (<= threshold or <= 7 days) > Medium (<= 14 days)
      if (product.stock <= 0 || daysRemaining <= 3) {
        priority = "Critical";
        criticalCount++;
      } else if (product.stock <= threshold || daysRemaining <= 7) {
        priority = "High";
        highCount++;
      } else if (daysRemaining <= 14 || product.stock <= threshold * 1.5) {
        priority = "Medium";
        mediumCount++;
      } else {
        // Not a suggestion priority
        return null;
      }

      // Restock Quantity Logic: Aim for 30-day buffer
      // If no sales but stock is 0, suggest a baseline restock
      let suggestedRestockQty = Math.ceil(avgDailySales * 30);
      if (suggestedRestockQty < 10) suggestedRestockQty = Math.max(10, threshold * 2);
      
      // Adjust to current stock
      suggestedRestockQty = Math.max(0, suggestedRestockQty - product.stock);
      
      // If we don't actually need to restock (qty 0), but it was marked priority? 
      // Force at least some restock if priority is Critical/High
      if (suggestedRestockQty === 0 && (priority === "Critical" || priority === "High")) {
        suggestedRestockQty = Math.max(5, threshold);
      }

      const estimatedRestockCost = suggestedRestockQty * product.price;
      totalEstimatedCost += estimatedRestockCost;

      return {
        _id: product._id,
        name: product.name,
        image: product.images?.[0]?.url || product.images?.[0] || "/placeholder.jpg",
        category: product.category,
        currentStock: product.stock,
        avgDailySales: parseFloat(avgDailySales.toFixed(2)),
        daysRemaining: daysRemaining === Infinity ? "N/A" : daysRemaining,
        priority,
        suggestedRestockQty,
        estimatedRestockCost: parseFloat(estimatedRestockCost.toFixed(2))
      };
    }).filter(s => s !== null);

    // Sort: Critical -> High -> Medium
    const priorityOrder = { "Critical": 0, "High": 1, "Medium": 2 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    res.status(200).json({
      summary: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        total: suggestions.length,
        totalEstimatedCost: parseFloat(totalEstimatedCost.toFixed(2))
      },
      suggestions
    });
  } catch (error) {
    console.error("Error in getRestockSuggestions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
