import { Product } from "../../models/product.model.js";
import cloudinary from "../../config/cloudinary.js";
import { checkAndCreateInventoryNotifications } from "../../services/notification.service.js";

// @desc    Create a product
// @route   POST /api/admin/products
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock, lowStockThreshold, color, size, brand, isFeatured, discountPrice } = req.body;
    
    // Process images
    const images = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        images.push(file.path); // Cloudinary URL from multer-storage-cloudinary
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

    // Handle new images
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(f => f.path);
      updateData.images = [...(product.images || []), ...newImages];
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
    
    // Check for low stock after update
    if (updateData.stock !== undefined) {
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
      for (const imageUrl of product.images) {
        const publicId = imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`products/${publicId}`);
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
      if (stockStatus === "in-stock") query.stock = { $gt: 10 };
      if (stockStatus === "low-stock") query.stock = { $gt: 0, $lte: 10 };
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

// @desc    Get inventory alerts
// @route   GET /api/admin/alerts
export const getInventoryAlerts = async (req, res) => {
  try {
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$stock", "$lowStockThreshold"] }
    }).select("name stock lowStockThreshold images category");

    res.status(200).json(lowStockProducts);
  } catch (error) {
    console.error("Error in getInventoryAlerts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
