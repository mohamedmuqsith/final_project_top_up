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

    const product = await Product.create({
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock),
      lowStockThreshold: lowStockThreshold !== undefined ? parseInt(lowStockThreshold) : 10,
      category,
      images: imageUrls,
    });

    // Fire inventory check immediately
    await checkAndCreateInventoryNotifications([product._id]);

    res.status(201).json(product);
  } catch (error) {
    console.error("Error creating product", error);
    res.status(500).json({ message: "Internal server error" });
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
    if (price !== undefined) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (lowStockThreshold !== undefined) product.lowStockThreshold = parseInt(lowStockThreshold);
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
    console.error("Error updating products:", error);
    res.status(500).json({ message: "Internal server error" });
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

export async function updateOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!["pending", "shipped", "delivered", "cancelled"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.status = status;

    if (status === "shipped" && !order.shippedAt) {
      order.shippedAt = new Date();
    }

    if (status === "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Trigger Notification natively
    let type = "";
    let message = "";
    if (status === "shipped") {
      type = "ORDER_SHIPPED";
      message = "Great news! Your order has been shipped and is on its way.";
    } else if (status === "delivered") {
      type = "ORDER_DELIVERED";
      message = "Your order has been delivered. Enjoy your electronics!";
    } else if (status === "pending") {
      type = "ORDER_PLACED";
      message = "Your order is pending fulfillment.";
    } else if (status === "cancelled") {
      type = "ORDER_CANCELLED";
      message = "Your order has been cancelled. Please contact support if you have questions.";
    }

    if (type) {
      // 1. Personal Personal Notification to CUSTOMER
      await createNotification({
        recipientType: "customer",
        recipientId: order.user.toString(), // Ensure ID is a string for broader compatibility
        title: `Your Order is ${status.charAt(0).toUpperCase() + status.slice(1)}`,
        message,
        type,
        entityId: order._id,
        entityModel: "Order",
      });

      // 2. Operational Business Notification to ADMIN (Feed)
      let adminType = "";
      let adminMessage = "";
      if (status === "shipped") {
        adminType = "ORDER_MARKED_SHIPPED";
        adminMessage = `Operational Alert: Order #${order._id.toString().slice(-6).toUpperCase()} marked as SHIPPED.`;
      } else if (status === "delivered") {
        adminType = "ORDER_MARKED_DELIVERED";
        adminMessage = `Operational Alert: Order #${order._id.toString().slice(-6).toUpperCase()} marked as DELIVERED.`;
      } else if (status === "cancelled") {
        adminType = "ORDER_CANCELLED";
        adminMessage = `Operational Alert: Order #${order._id.toString().slice(-6).toUpperCase()} marked as CANCELLED.`;
      }

      if (adminType) {
        await createNotification({
          recipientType: "admin",
          title: adminType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '),
          message: adminMessage,
          type: adminType,
          entityId: order._id,
          entityModel: "Order",
          actionUrl: "/orders"
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