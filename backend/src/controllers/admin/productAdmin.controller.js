import { Product } from "../../models/product.model.js";
import { Order } from "../../models/order.model.js";
import cloudinary from "../../config/cloudinary.js";
import { checkAndCreateInventoryNotifications } from "../../services/notification.service.js";
import { InventoryHistory } from "../../models/inventoryHistory.model.js";
import { InventoryService } from "../../services/inventory.service.js";

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
    
    // Enrich with pricing (offers/discounts) for the frontend
    const { enrichProductsWithPrices } = await import("../../services/pricing.service.js");
    const enrichedProducts = await enrichProductsWithPrices(products);
    
    res.status(200).json(enrichedProducts);
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

// @desc    Get inventory alerts (using centralized predictive engine)
// @route   GET /api/admin/alerts
export const getInventoryAlerts = async (req, res) => {
  try {
    const predictions = await InventoryService.calculateStockPredictions({ lookbackDays: 30 });

    // Filter results to only those that actually have an alert condition
    const alerts = predictions
      .filter(p => p.alertType !== "Healthy")
      .map(p => ({
        _id: `alert-${p.productId}`, // unique id for frontend
        productId: p.productId,
        productName: p.name,
        image: p.image,
        type: p.alertType,
        severity: p.severity,
        currentStock: p.currentStock,
        threshold: p.lowStockThreshold,
        avgDailySales: p.avgDailySales,
        daysRemaining: p.daysRemaining,
        category: p.category
      }));

    // Sort: Critical first, then High, then Medium
    const severityOrder = { "Critical": 0, "High": 1, "Medium": 2 };
    alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    res.status(200).json(alerts);
  } catch (error) {
    console.error("Error in getInventoryAlerts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get restock suggestions (using centralized predictive engine)
// @route   GET /api/admin/restock-suggestions
export const getRestockSuggestions = async (req, res) => {
  try {
    const predictions = await InventoryService.calculateStockPredictions({ lookbackDays: 30 });

    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let totalEstimatedCost = 0;

    const suggestions = predictions
      .filter(p => p.suggestedRestockQty > 0 || p.severity !== "Low")
      .map(p => {
        // Stats for summary
        if (p.severity === "Critical") criticalCount++;
        else if (p.severity === "High") highCount++;
        else if (p.severity === "Medium") mediumCount++;

        totalEstimatedCost += p.estimatedRestockCost;

        return {
          _id: p.productId,
          name: p.name,
          image: p.image,
          category: p.category,
          currentStock: p.currentStock,
          avgDailySales: p.avgDailySales,
          daysRemaining: p.daysRemaining,
          priority: p.severity === "Low" ? "Medium" : p.severity, // Map to existing priority scale
          suggestedRestockQty: p.suggestedRestockQty,
          estimatedRestockCost: p.estimatedRestockCost
        };
      });

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
