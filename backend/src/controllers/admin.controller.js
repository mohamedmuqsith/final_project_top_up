import cloudinary from "../config/cloudinary.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { createNotification, checkAndCreateInventoryNotifications } from "../services/notification.service.js";

export async function createProduct(req, res) {
  try {
    const { name, description, price, stock, category, lowStockThreshold } = req.body;

    if (!name || !description || !price || !stock || !category) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    if (req.files.length > 3) {
      return res.status(400).json({ message: "Maximum 3 images allowed" });
    }

    const uploadPromises = req.files.map((file) => {
      return cloudinary.uploader.upload(file.path, {
        folder: "products",
      });
    });

    const uploadResults = await Promise.all(uploadPromises);

    const imageUrls = uploadResults.map((result) => result.secure_url);

    const parsedPrice = parseFloat(price);
    const parsedStock = parseInt(stock);
    const parsedThreshold = lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 10;

    if (isNaN(parsedPrice) || isNaN(parsedStock)) {
      return res.status(400).json({ message: "Invalid price or stock value" });
    }

    const product = await Product.create({
      name,
      description,
      price: parsedPrice,
      stock: parsedStock,
      lowStockThreshold: isNaN(parsedThreshold) ? 10 : parsedThreshold,
      category,
      images: imageUrls,
    });

    // Fire inventory check immediately
    await checkAndCreateInventoryNotifications([product._id]);

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message,
      details: error.errors
    });
  }
}

export async function getAllProducts(_, res) {
  try {
    // -1 means in desc order: most recent products first
    // Note: Use lean to modify the objects dynamically
    const products = await Product.find().sort({ createdAt: -1 }).lean();
    
    // Determine isLowStock exactly here
    const productsWithStatus = products.map(product => {
      const threshold = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 10;
      return {
        ...product,
        isLowStock: product.stock <= threshold
      };
    });

    res.status(200).json(productsWithStatus);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}

export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, lowStockThreshold } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (name) product.name = name;
    if (description) product.description = description;
    
    // Robust parsing for numbers
    if (price !== undefined && price !== "") {
      const parsedPrice = parseFloat(price);
      if (!isNaN(parsedPrice)) {
        product.price = parsedPrice;
      }
    }
    
    if (stock !== undefined && stock !== "") {
      const parsedStock = parseInt(stock);
      if (!isNaN(parsedStock)) {
        product.stock = parsedStock;
      }
    }
    
    if (lowStockThreshold !== undefined && lowStockThreshold !== "") {
      const parsedThreshold = parseInt(lowStockThreshold);
      if (!isNaN(parsedThreshold)) {
        product.lowStockThreshold = parsedThreshold;
      }
    }

    if (category) product.category = category;

    // handle image updates if new images are uploaded
    if (req.files && req.files.length > 0) {
      if (req.files.length > 3) {
        return res.status(400).json({ message: "Maximum 3 images allowed" });
      }

      const uploadPromises = req.files.map((file) => {
        return cloudinary.uploader.upload(file.path, {
          folder: "products",
        });
      });

      const uploadResults = await Promise.all(uploadPromises);
      product.images = uploadResults.map((result) => result.secure_url);
    }

    await product.save();

    // Trigger inventory notification evaluation when stock or thresholds change
    if (stock !== undefined || lowStockThreshold !== undefined) {
      await checkAndCreateInventoryNotifications([product._id]);
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message,
      details: error.errors // Mongoose validation details
    });
  }
}

export async function getAllOrders(_, res) {
  try {
    const orders = await Order.find()
      .populate("user", "name email")
      .populate("orderItems.product")
      .sort({ createdAt: -1 });

    res.status(200).json({ orders });
  } catch (error) {
    console.error("Error in getAllOrders controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const ALLOWED_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [], // terminal state
  cancelled: [], // terminal state
};

export async function updateOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status: newStatus } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const currentStatus = order.status;

    // Validate transition
    if (newStatus !== currentStatus) {
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(newStatus)) {
        return res.status(400).json({
          error: `Invalid transition from ${currentStatus} to ${newStatus}`,
          allowedTransitions: allowedNext,
        });
      }
    }

    order.status = newStatus;

    if (newStatus === "shipped" && !order.shippedAt) {
      order.shippedAt = new Date();
    }

    if (newStatus === "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Trigger Notification
    let type = "";
    let message = "";
    if (newStatus === "processing") {
      type = "ORDER_PROCESSING";
      message = "Your order is now being processed and prepared for shipment.";
    } else if (newStatus === "shipped") {
      type = "ORDER_SHIPPED";
      message = "Great news! Your order has been shipped and is on its way.";
    } else if (newStatus === "delivered") {
      type = "ORDER_DELIVERED";
      message = "Your order has been delivered. Enjoy your electronics!";
    } else if (newStatus === "cancelled") {
      type = "ORDER_CANCELLED";
      message = "Your order has been cancelled. Please contact support if you have questions.";
    }

    if (type) {
      // 1. Customer Notification
      await createNotification({
        recipientType: "customer",
        recipientId: order.user.toString(),
        title: `Order #${order._id.toString().slice(-6).toUpperCase()} is ${newStatus.toUpperCase()}`,
        message,
        type,
        entityId: order._id,
        entityModel: "Order",
      });

      // 2. Admin Operational Notification
      let adminType = "";
      if (newStatus === "processing") adminType = "ORDER_MARKED_PROCESSING";
      else if (newStatus === "shipped") adminType = "ORDER_MARKED_SHIPPED";
      else if (newStatus === "delivered") adminType = "ORDER_MARKED_DELIVERED";
      else if (newStatus === "cancelled") adminType = "ORDER_CANCELLED";

      if (adminType) {
        await createNotification({
          recipientType: "admin",
          title: adminType.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" "),
          message: `Operational: Order #${order._id.toString().slice(-6).toUpperCase()} updated to ${newStatus.toUpperCase()}.`,
          type: adminType,
          entityId: order._id,
          entityModel: "Order",
          actionUrl: "/orders",
        });
      }
    }

    res.status(200).json({ message: "Order status updated successfully", order });
  } catch (error) {
    console.error("Error in updateOrderStatus controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllCustomers(_, res) {
  try {
    const customers = await User.find().sort({ createdAt: -1 }); // latest user first
    res.status(200).json({ customers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const { timeRange = "weekly" } = req.query; // "daily" | "weekly" | "monthly"

    const totalOrders = await Order.countDocuments();

    const revenueResult = await Order.aggregate([
      { $match: { "paymentResult.status": "succeeded" } },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalPrice" },
        },
      },
    ]);

    const totalRevenue = revenueResult[0]?.total || 0;

    const totalCustomers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();

    // Recent Orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user", "name email");

    // Low Stock & Predicted Stockouts
    const products = await Product.find({}, "name stock price images lowStockThreshold").lean();
    const lowStockProducts = [];
    const predictedStockouts = [];

    // Calculate avg daily units sold over the last 30 days for predicted stockout
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const salesAggregation = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          "paymentResult.status": "succeeded",
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalQuantitySold: { $sum: "$orderItems.quantity" },
        },
      },
    ]);

    const salesMap = {};
    salesAggregation.forEach((item) => {
      salesMap[item._id.toString()] = item.totalQuantitySold / 30;
    });

    products.forEach((product) => {
      // low stock logic
      const threshold = product.lowStockThreshold || 10;
      if (product.stock <= threshold) {
        lowStockProducts.push({
          _id: product._id,
          name: product.name,
          stock: product.stock,
          threshold: threshold,
          image: product.images?.[0],
        });
      }

      // predicted stockout logic
      const avgDaily = salesMap[product._id.toString()] || 0;
      if (avgDaily > 0) {
        const daysRemaining = product.stock / avgDaily;
        if (daysRemaining <= 7) {
          predictedStockouts.push({
            _id: product._id,
            name: product.name,
            stock: product.stock,
            avgDailyUnitsSold: avgDaily.toFixed(2),
            daysRemaining: Math.floor(daysRemaining),
            image: product.images?.[0],
          });
        }
      } else if (product.stock === 0) {
        predictedStockouts.push({
          _id: product._id,
          name: product.name,
          stock: product.stock,
          avgDailyUnitsSold: 0,
          daysRemaining: 0,
          image: product.images?.[0],
        });
      }
    });

    // Time-series charting data
    let dateFormat;
    if (timeRange === "daily") {
      dateFormat = "%Y-%m-%d";
    } else if (timeRange === "weekly") {
      dateFormat = "%Y-%U"; // Year and week number
    } else {
      dateFormat = "%Y-%m"; // Monthly
    }

    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          orders: { $sum: 1 },
          totalSales: {
            $sum: {
              $cond: [{ $eq: ["$paymentResult.status", "succeeded"] }, "$totalPrice", 0],
            },
          },
        },
      },
      { $sort: { _id: 1 } }, // chronologically sort asc
    ]);

    const chartData = orderStats.map((stat) => ({
      date: stat._id,
      revenue: parseFloat(stat.totalSales.toFixed(2)),
      orders: stat.orders,
    }));

    res.status(200).json({
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      recentOrders,
      lowStockProducts,
      predictedStockouts,
      chartData,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map((imageUrl) => {
        // Extract public_id from URL (assumes format: .../products/publicId.ext)
        const publicId = "products/" + imageUrl.split("/products/")[1]?.split(".")[0];
        if (publicId) return cloudinary.uploader.destroy(publicId);
      });
      await Promise.all(deletePromises.filter(Boolean));
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ message: "Failed to delete product" });
  }
};

export async function getInventoryAlerts(req, res) {
  try {
    const products = await Product.find({}, "name stock price images lowStockThreshold").lean();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Calculate units sold in the last 7 days from valid paid/completed orders
    const salesAggregation = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
          "paymentResult.status": "succeeded",
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalQuantitySold: { $sum: "$orderItems.quantity" },
        },
      },
    ]);

    const salesMap = {};
    salesAggregation.forEach((item) => {
      salesMap[item._id.toString()] = item.totalQuantitySold / 7; // Average daily sales over 7 days
    });

    const alerts = [];

    products.forEach((product) => {
      const avgDaily = salesMap[product._id.toString()] || 0;
      const daysRemaining = avgDaily > 0 ? product.stock / avgDaily : Infinity;
      const threshold = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 10;
      
      let severity = null;
      let type = null;

      if (product.stock <= 0) {
        severity = "Critical";
        type = "Out of Stock";
      } else if (daysRemaining <= 1) {
        severity = "Critical";
        type = "Predicted Stockout";
      } else if (product.stock <= threshold) {
        severity = "High";
        type = "Low Stock";
      } else if (daysRemaining <= 3) {
        severity = "High";
        type = "Predicted Stockout";
      } else if (daysRemaining <= 7) {
        severity = "Medium";
        type = "Predicted Stockout";
      }

      if (severity) {
        alerts.push({
          _id: product._id,
          productName: product.name,
          image: product.images?.[0],
          currentStock: product.stock,
          threshold: threshold,
          type,
          severity,
          avgDailySales: avgDaily.toFixed(2),
          daysRemaining: daysRemaining === Infinity ? "N/A" : Math.floor(daysRemaining)
        });
      }
    });

    // Sort by severity: Critical > High > Medium
    const severityMap = { "Critical": 3, "High": 2, "Medium": 1 };
    alerts.sort((a, b) => severityMap[b.severity] - severityMap[a.severity]);

    res.status(200).json(alerts);
  } catch (error) {
    console.error("Error fetching inventory alerts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/admin/sales-report?range=30d|90d|ytd
export async function getSalesReport(req, res) {
  try {
    const { range = "30d" } = req.query;

    // Determine date range
    const now = new Date();
    let startDate;
    let dateFormat;
    let groupLabel;

    if (range === "90d") {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      dateFormat = "%Y-W%U"; // weekly
      groupLabel = "weekly";
    } else if (range === "ytd") {
      startDate = new Date(now.getFullYear(), 0, 1); // Jan 1st of current year
      dateFormat = "%Y-%m"; // monthly
      groupLabel = "monthly";
    } else {
      // Default: 30d
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      dateFormat = "%Y-%m-%d"; // daily
      groupLabel = "daily";
    }

    const matchStage = {
      createdAt: { $gte: startDate },
      "paymentResult.status": "succeeded",
    };

    // 1. Summary metrics
    const summaryAgg = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalPrice" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = summaryAgg[0]?.totalRevenue || 0;
    const totalOrders = summaryAgg[0]?.totalOrders || 0;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // 2. Revenue & orders over time
    const timeSeriesAgg = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const chartData = timeSeriesAgg.map((item) => ({
      date: item._id,
      revenue: parseFloat(item.revenue.toFixed(2)),
      orders: item.orders,
    }));

    // 3. Top products by units sold
    const topProductsAgg = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          totalUnitsSold: { $sum: "$orderItems.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
          },
          productName: { $first: "$orderItems.name" },
          productImage: { $first: "$orderItems.image" },
        },
      },
      { $sort: { totalUnitsSold: -1 } },
      { $limit: 5 },
    ]);

    // Enrich top products with current stock from Product collection
    const productIds = topProductsAgg.map((p) => p._id);
    const productsData = await Product.find(
      { _id: { $in: productIds } },
      "stock"
    ).lean();
    const stockMap = {};
    productsData.forEach((p) => {
      stockMap[p._id.toString()] = p.stock;
    });

    const topProducts = topProductsAgg.map((p) => ({
      _id: p._id,
      name: p.productName,
      image: p.productImage,
      unitsSold: p.totalUnitsSold,
      revenue: parseFloat(p.totalRevenue.toFixed(2)),
      stock: stockMap[p._id.toString()] ?? 0,
    }));

    // 4. Top categories by revenue
    const topCategoriesAgg = await Order.aggregate([
      { $match: matchStage },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: "$productInfo.category",
          totalRevenue: {
            $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] },
          },
          totalUnitsSold: { $sum: "$orderItems.quantity" },
          productCount: { $addToSet: "$orderItems.product" },
        },
      },
      {
        $project: {
          _id: 1,
          totalRevenue: 1,
          totalUnitsSold: 1,
          productCount: { $size: "$productCount" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 5 },
    ]);

    const topCategories = topCategoriesAgg.map((c) => ({
      category: c._id,
      revenue: parseFloat(c.totalRevenue.toFixed(2)),
      unitsSold: c.totalUnitsSold,
      productCount: c.productCount,
    }));

    res.status(200).json({
      summary: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        totalOrders,
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      },
      chartData,
      topProducts,
      topCategories,
      grouping: groupLabel,
      range,
    });
  } catch (error) {
    console.error("Error fetching sales report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/admin/inventory-report
export async function getInventoryReport(req, res) {
  try {
    // 1. Summary Metrics & Category Aggregations
    const inventoryAgg = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalInventoryValue: { $sum: { $multiply: ["$stock", "$price"] } },
          totalUnitsInStock: { $sum: "$stock" },
          outOfStockCount: {
            $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] },
          },
        },
      },
    ]);

    const summary = inventoryAgg[0] || {
      totalInventoryValue: 0,
      totalUnitsInStock: 0,
      outOfStockCount: 0,
    };

    // Category Aggregations
    const categoryAgg = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          totalUnits: { $sum: "$stock" },
          totalValue: { $sum: { $multiply: ["$stock", "$price"] } },
          productCount: { $sum: 1 },
        },
      },
      { $sort: { totalUnits: -1 } },
    ]);

    const stockByCategory = categoryAgg.map((cat) => ({
      name: cat._id,
      units: cat.totalUnits,
      value: parseFloat(cat.totalValue.toFixed(2)),
      productCount: cat.productCount,
    }));

    // 2. Out of Stock List
    const outOfStockProducts = await Product.find(
      { stock: { $lte: 0 } },
      "name category price images stock lowStockThreshold updatedAt"
    )
      .sort({ updatedAt: -1 })
      .lean();

    // 3. Low Stock List
    // We need to find products where 0 < stock <= (lowStockThreshold || 10)
    // To do this efficiently in MongoDB across all docs, we can use an aggregation or $expr
    const lowStockProducts = await Product.find({
      $and: [
        { stock: { $gt: 0 } },
        {
          $expr: {
            $lte: ["$stock", { $ifNull: ["$lowStockThreshold", 10] }],
          },
        },
      ],
    })
      .select("name category price images stock lowStockThreshold updatedAt")
      .sort({ stock: 1 }) // sort by lowest stock first
      .lean();

    // Format lists
    const formatProduct = (p) => ({
      _id: p._id,
      name: p.name,
      category: p.category,
      price: p.price,
      stock: p.stock,
      threshold: p.lowStockThreshold || 10,
      image: p.images?.[0],
      updatedAt: p.updatedAt,
    });

    res.status(200).json({
      summary: {
        totalInventoryValue: parseFloat(summary.totalInventoryValue.toFixed(2)),
        totalUnitsInStock: summary.totalUnitsInStock,
        outOfStockCount: summary.outOfStockCount,
        incomingItems: 0, // Not currently supported by backend
      },
      stockByCategory,
      outOfStockList: outOfStockProducts.map(formatProduct),
      lowStockList: lowStockProducts.map(formatProduct),
    });
  } catch (error) {
    console.error("Error fetching inventory report:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}