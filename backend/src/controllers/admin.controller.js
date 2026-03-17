import cloudinary from "../config/cloudinary.js";
import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";
import { Review } from "../models/review.model.js";
import { createNotification, checkAndCreateInventoryNotifications } from "../services/notification.service.js";
import { enrichProductsWithPrices } from "../services/pricing.service.js";

export async function createProduct(req, res) {
  try {
    const { name, description, price, stock, category, lowStockThreshold } = req.body;

    if (!name || !description || !price || !stock || !category) {
      return res.status(400).json({ error: "All fields are required" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "At least one image is required" });
    }

    if (req.files.length > 3) {
      return res.status(400).json({ error: "Maximum 3 images allowed" });
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
      return res.status(400).json({ error: "Invalid price or stock value" });
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
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllProducts(req, res) {
  try {
    const { minPrice, maxPrice, category, stockStatus } = req.query;
    const query = {};

    if (category && category !== "All") {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }

    if (stockStatus) {
      if (stockStatus === "Out of Stock") query.stock = 0;
      if (stockStatus === "Low Stock") query.stock = { $gt: 0, $lte: 10 };
      if (stockStatus === "In Stock") query.stock = { $gt: 10 };
    }

    const products = await Product.find(query).sort({ createdAt: -1 }).lean();
    
    // Determine isLowStock exactly here
    const productsWithStatus = products.map(product => {
      const threshold = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 10;
      return {
        ...product,
        isLowStock: product.stock <= threshold
      };
    });

    const enrichedProducts = await enrichProductsWithPrices(productsWithStatus);
    res.status(200).json(enrichedProducts);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, description, price, stock, category, lowStockThreshold } = req.body;

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
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
        return res.status(400).json({ error: "Maximum 3 images allowed" });
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
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAllOrders(req, res) {
  try {
    const { status, startDate, endDate, minPrice, maxPrice, category, stockStatus } = req.query;
    const query = {};

    if (status && status !== "All") {
      query.status = status.toLowerCase();
    }

    if (category && category !== "All") {
      query.category = category;
    }

    if (stockStatus) {
      if (stockStatus === "Out of Stock") query.stock = 0;
      if (stockStatus === "Low Stock") query.stock = { $gt: 0, $lte: 10 }; // Default threshold
      if (stockStatus === "In Stock") query.stock = { $gt: 10 };
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (minPrice || maxPrice) {
      query.totalPrice = {};
      if (minPrice) query.totalPrice.$gte = parseFloat(minPrice);
      if (maxPrice) query.totalPrice.$lte = parseFloat(maxPrice);
    }

    const orders = await Order.find(query)
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
    const { status: newStatus } = req.body;

    const ALLOWED_TRANSITIONS = {
      pending: ["processing", "cancelled"],
      processing: ["shipped", "cancelled"],
      shipped: ["delivered"],
      delivered: ["return-requested"], // Customer usually starts this, but admin might force manual
      "return-requested": ["approved", "denied"],
      approved: ["refunded"],
      refunded: [], // Terminal
      denied: ["delivered"], // Rollback to delivered if denied
      cancelled: [], // Terminal
    };

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const currentStatus = order.status;

    // ─── Legacy Migration / Fallback Seeding ──────────────────
    // If order has no history yet, seed it with the current actual status
    if (!order.statusHistory || order.statusHistory.length === 0) {
      order.statusHistory = [
        {
          status: currentStatus,
          timestamp: order.createdAt || new Date(),
          comment: "Initial status record (Legacy Migration)",
          changedByType: "system"
        }
      ];
    }

    // Validate transition
    if (currentStatus !== newStatus) {
      if (!ALLOWED_TRANSITIONS[currentStatus].includes(newStatus)) {
        return res.status(400).json({ 
          error: `Invalid status transition from '${currentStatus}' to '${newStatus}'` 
        });
      }
    } else {
      // If same status, just return success
      return res.status(200).json(order);
    }

    order.status = newStatus;

    // Record History
    const adminId = req.user?._id;
    const { comment: adminComment } = req.body;
    
    order.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      comment: adminComment || `Status updated to ${newStatus} via Admin Panel`,
      changedBy: adminId,
      changedByType: "admin"
    });

    if (newStatus === "approved") {
      order.returnStatus = "approved";
    } else if (newStatus === "denied") {
      order.returnStatus = "denied";
    } else if (newStatus === "refunded") {
      order.returnStatus = "refunded";
    }

    if (newStatus === "shipped" && !order.shippedAt) {
      order.shippedAt = new Date();
    }

    if (newStatus === "delivered" && !order.deliveredAt) {
      order.deliveredAt = new Date();
    }

    await order.save();

    // Trigger Notification natively
    let type = "";
    let message = "";
    if (newStatus === "processing") {
      type = "ORDER_PLACED"; // Reuse or create specific one if needed
      message = "Your order is now being processed.";
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
      // 1. Personal Notification to CUSTOMER
      await createNotification({
        recipientType: "customer",
        recipientId: order.user.toString(),
        title: `Your Order is ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`,
        message,
        type,
        entityId: order._id,
        entityModel: "Order",
      });

      // 2. Operational Business Notification to ADMIN (Feed)
      let adminType = "";
      let adminMessage = "";
      const idStr = order._id.toString().slice(-6).toUpperCase();
      
      if (newStatus === "processing") {
        adminType = "NEW_ORDER";
        adminMessage = `Operational Alert: Order #${idStr} moved to PROCESSING.`;
      } else if (newStatus === "shipped") {
        adminType = "ORDER_MARKED_SHIPPED";
        adminMessage = `Operational Alert: Order #${idStr} marked as SHIPPED.`;
      } else if (newStatus === "delivered") {
        adminType = "ORDER_MARKED_DELIVERED";
        adminMessage = `Operational Alert: Order #${idStr} marked as DELIVERED.`;
      } else if (newStatus === "cancelled") {
        adminType = "ORDER_CANCELLED";
        adminMessage = `Operational Alert: Order #${idStr} marked as CANCELLED.`;
      } else if (newStatus === "return-requested") {
        adminType = "RETURN_REQUESTED";
        adminMessage = `Attention Needed: Return requested for Order #${idStr}.`;
      } else if (newStatus === "refunded") {
        adminType = "ORDER_REFUNDED";
        adminMessage = `Operational Alert: Order #${idStr} has been REFUNDED.`;
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

export async function getAllCustomers(req, res) {
  try {
    const { segment, minSpend, maxSpend, minOrders, search } = req.query;
    const userQuery = {};
    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await User.find(userQuery).sort({ createdAt: -1 }).lean();

    // Aggregate order stats per customer with revenue-based top category
    const orderStats = await Order.aggregate([
      {
        $group: {
          _id: "$user",
          totalOrders: { $sum: 1 },
          totalSpend: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$paymentResult.status", "succeeded"] },
                    { $ne: ["$status", "cancelled"] },
                  ],
                },
                "$totalPrice",
                0,
              ],
            },
          },
          lastOrderDate: { $max: "$createdAt" },
        },
      },
    ]);

    // NEW: Deeper aggregation for Top Category PER CUSTOMER (by Revenue)
    const categoryStats = await Order.aggregate([
      { $match: { "paymentResult.status": "succeeded", status: { $ne: "cancelled" } } },
      { $unwind: "$orderItems" },
      // Note: We need to populate category which is on Product, but in aggregate we likely have the ID or string if stored.
      // Assuming orderItems.product has category or we join with Products.
      // Looking at order.model.js, orderItems has name, price, quantity, img. 
      // It DOES NOT have category. We must join with Product.
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $group: {
          _id: { user: "$user", category: "$productDetails.category" },
          categoryRevenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } }
        }
      },
      { $sort: { categoryRevenue: -1 } },
      {
        $group: {
          _id: "$_id.user",
          topCategory: { $first: "$_id.category" },
          topCategoryRevenue: { $first: "$categoryRevenue" }
        }
      }
    ]);

    const statsMap = {};
    orderStats.forEach((stat) => {
      statsMap[stat._id.toString()] = {
        totalOrders: stat.totalOrders,
        totalSpend: parseFloat(stat.totalSpend.toFixed(2)),
        lastOrderDate: stat.lastOrderDate,
      };
    });

    categoryStats.forEach((cat) => {
      if (statsMap[cat._id.toString()]) {
        statsMap[cat._id.toString()].topCategory = cat.topCategory;
      }
    });

    const now = new Date();

    const enrichedCustomers = customers.map((customer) => {
      const stats = statsMap[customer._id.toString()] || {
        totalOrders: 0,
        totalSpend: 0,
        lastOrderDate: null,
        topCategory: "None",
      };

      // Compute customer segment
      let segment = "New";
      const daysSinceLastOrder = stats.lastOrderDate
        ? Math.floor((now - new Date(stats.lastOrderDate)) / (1000 * 60 * 60 * 24))
        : null;
      const daysSinceJoined = Math.floor((now - new Date(customer.createdAt)) / (1000 * 60 * 60 * 24));

      if (stats.totalOrders >= 5 || stats.totalSpend >= 500) {
        segment = "VIP";
      } else if (stats.totalOrders >= 2 && daysSinceLastOrder !== null && daysSinceLastOrder > 60) {
        segment = "At-Risk";
      } else if (stats.totalOrders >= 2) {
        segment = "Repeat";
      } else if (stats.totalOrders <= 1 && daysSinceJoined <= 30) {
        segment = "New";
      } else if (stats.totalOrders <= 1 && daysSinceJoined > 30) {
        segment = "At-Risk";
      }

      return {
        ...customer,
        orderStats: stats,
        segment,
      };
    });

    // Apply deeper filters to enriched customers
    let filteredCustomers = enrichedCustomers;

    if (segment && segment !== "All") {
      filteredCustomers = filteredCustomers.filter(c => c.segment === segment);
    }

    if (minSpend) {
      filteredCustomers = filteredCustomers.filter(c => c.orderStats.totalSpend >= parseFloat(minSpend));
    }
    if (maxSpend) {
      filteredCustomers = filteredCustomers.filter(c => c.orderStats.totalSpend <= parseFloat(maxSpend));
    }
    if (minOrders) {
      filteredCustomers = filteredCustomers.filter(c => c.orderStats.totalOrders >= parseInt(minOrders));
    }

    res.status(200).json({ customers: filteredCustomers });
  } catch (error) {
    console.error("Error fetching customers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getCustomerStats(req, res) {
  try {
    const { id } = req.params;
    const customer = await User.findById(id).lean();
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const orders = await Order.find({ user: id })
      .sort({ createdAt: -1 })
      .populate("orderItems.product");

    const successfulOrders = orders.filter(
      (o) => o.paymentResult?.status === "succeeded" && o.status !== "cancelled"
    );

    const totalOrders = orders.length;
    const totalSpend = successfulOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const avgOrderValue = totalOrders > 0 ? totalSpend / totalOrders : 0;

    // Calculate top category by revenue
    const catRevenue = {};
    successfulOrders.forEach((order) => {
      order.orderItems.forEach((item) => {
        const cat = item.product?.category || "Unknown";
        catRevenue[cat] = (catRevenue[cat] || 0) + item.price * item.quantity;
      });
    });

    let topCategory = "None";
    let maxRev = 0;
    Object.entries(catRevenue).forEach(([cat, rev]) => {
      if (rev > maxRev) {
        maxRev = rev;
        topCategory = cat;
      }
    });

    const stats = {
      totalOrders,
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      topCategory,
      lastOrderDate: orders[0]?.createdAt || null,
      latestOrderItems: orders[0]?.orderItems.map((i) => i.name).slice(0, 3) || [],
      orderHistory: orders.slice(0, 10), // Return last 10 for the detail view
    };

    res.status(200).json({ customer, stats });
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getDashboardStats(req, res) {
  try {
    const { timeRange = "weekly" } = req.query; // "daily" | "weekly" | "monthly"

    const totalOrders = await Order.countDocuments();
    const confirmedSales = await Order.countDocuments({ "paymentResult.status": "succeeded", status: { $ne: "cancelled" } });
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" });
    const cancellationRate = totalOrders > 0 ? ((cancelledOrders / totalOrders) * 100).toFixed(1) : 0;

    const statusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const statusMap = statusBreakdown.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const revenueResult = await Order.aggregate([
      { $match: { "paymentResult.status": "succeeded", status: { $ne: "cancelled" } } },
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
          status: { $ne: "cancelled" },
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
              $cond: [
                { 
                  $and: [
                    { $eq: ["$paymentResult.status", "succeeded"] },
                    { $ne: ["$status", "cancelled"] }
                  ]
                }, 
                "$totalPrice", 
                0
              ],
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

    // Review summary for dashboard
    const reviewSummaryAgg = await Review.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);
    const reviewSummary = {
      totalReviews: reviewSummaryAgg[0]?.totalReviews || 0,
      averageRating: reviewSummaryAgg[0]?.averageRating || 0,
    };

    res.status(200).json({
      totalRevenue,
      totalOrders,
      confirmedSales,
      cancelledOrders,
      cancellationRate,
      statusMap,
      totalCustomers,
      totalProducts,
      recentOrders,
      lowStockProducts,
      predictedStockouts,
      chartData,
      reviewSummary,
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
      return res.status(404).json({ error: "Product not found" });
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
    res.status(500).json({ error: "Failed to delete product" });
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
          status: { $ne: "cancelled" },
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
// GET /api/admin/sales-report?range=30d|90d|ytd
export async function getSalesReport(req, res) {
  try {
    const { range = "30d" } = req.query;

    // Determine date range
    const now = new Date();
    let currentStartDate;
    let previousStartDate;
    let dateFormat;
    let groupLabel;
    let timeUnit; // for chart padding

    if (range === "90d") {
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 90);
      previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - 90);
      dateFormat = "%Y-W%U";
      groupLabel = "weekly";
      timeUnit = "week";
    } else if (range === "ytd") {
      currentStartDate = new Date(now.getFullYear(), 0, 1);
      previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
      dateFormat = "%Y-%m";
      groupLabel = "monthly";
      timeUnit = "month";
    } else {
      // Default: 30d
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 30);
      previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - 30);
      dateFormat = "%Y-%m-%d";
      groupLabel = "daily";
      timeUnit = "day";
    }

    // Helper for summary aggregation
    const getSummary = async (start, end) => {
      const match = { createdAt: { $gte: start } };
      if (end) match.createdAt.$lt = end;

      const agg = await Order.aggregate([
        {
          $facet: {
            revenueStats: [
              { 
                $match: { 
                  ...match,
                  "paymentResult.status": "succeeded",
                  status: { $ne: "cancelled" }
                } 
              },
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$totalPrice" },
                  totalConfirmedSales: { $sum: 1 },
                },
              },
            ],
            totalStats: [
              { $match: match },
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  cancelledOrders: {
                    $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
                  },
                },
              },
            ],
          },
        },
        {
          $project: {
            totalRevenue: { $ifNull: [{ $arrayElemAt: ["$revenueStats.totalRevenue", 0] }, 0] },
            totalConfirmedSales: { $ifNull: [{ $arrayElemAt: ["$revenueStats.totalConfirmedSales", 0] }, 0] },
            totalOrders: { $ifNull: [{ $arrayElemAt: ["$totalStats.totalOrders", 0] }, 0] },
            cancelledOrders: { $ifNull: [{ $arrayElemAt: ["$totalStats.cancelledOrders", 0] }, 0] },
          },
        },
      ]);
      return agg[0] || { totalRevenue: 0, totalConfirmedSales: 0, totalOrders: 0, cancelledOrders: 0 };
    };

    // 1. Comparison Metrics
    const currentSummary = await getSummary(currentStartDate);
    const previousSummary = await getSummary(previousStartDate, currentStartDate);

    const calcChange = (current, previous) => {
      if (!previous) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const summary = {
      totalRevenue: parseFloat(currentSummary.totalRevenue.toFixed(2)),
      totalOrders: currentSummary.totalOrders,
      totalConfirmedSales: currentSummary.totalConfirmedSales,
      cancelledOrders: currentSummary.cancelledOrders,
      avgOrderValue: currentSummary.totalConfirmedSales > 0 ? parseFloat((currentSummary.totalRevenue / currentSummary.totalConfirmedSales).toFixed(2)) : 0,
      cancellationRate: currentSummary.totalOrders > 0 ? parseFloat(((currentSummary.cancelledOrders / currentSummary.totalOrders) * 100).toFixed(1)) : 0,
      
      // Comparison metrics
      comparison: {
        revenueChange: parseFloat(calcChange(currentSummary.totalRevenue, previousSummary.totalRevenue).toFixed(1)),
        ordersChange: parseFloat(calcChange(currentSummary.totalOrders, previousSummary.totalOrders).toFixed(1)),
        avgOrderValueChange: parseFloat(calcChange(
          currentSummary.totalConfirmedSales > 0 ? currentSummary.totalRevenue / currentSummary.totalConfirmedSales : 0,
          previousSummary.totalConfirmedSales > 0 ? previousSummary.totalRevenue / previousSummary.totalConfirmedSales : 0
        ).toFixed(1)),
        cancellationRateChange: parseFloat((
          (currentSummary.totalOrders > 0 ? (currentSummary.cancelledOrders / currentSummary.totalOrders) * 100 : 0) -
          (previousSummary.totalOrders > 0 ? (previousSummary.cancelledOrders / previousSummary.totalOrders) * 100 : 0)
        ).toFixed(1))
      }
    };

    // 2. Revenue & orders over time (Current period only for chart)
    const timeSeriesAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: currentStartDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $eq: ["$paymentResult.status", "succeeded"] },
                    { $ne: ["$status", "cancelled"] }
                  ]
                }, 
                "$totalPrice", 
                0
              ],
            },
          },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Padding logic
    const paddedChartData = [];
    const tempDate = new Date(currentStartDate);
    const endDate = new Date(now);

    const formatDateK = (date) => {
      if (timeUnit === "day") return date.toISOString().split("T")[0];
      if (timeUnit === "month") return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (timeUnit === "week") {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        const weekNum = Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
        return `${date.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
      }
    };

    const dataMap = new Map(timeSeriesAgg.map(item => [item._id, item]));

    while (tempDate <= endDate) {
      const key = formatDateK(tempDate);
      const existing = dataMap.get(key);
      paddedChartData.push({
        date: key,
        revenue: existing ? parseFloat(existing.revenue.toFixed(2)) : 0,
        orders: existing ? existing.orders : 0
      });

      if (timeUnit === "day") tempDate.setDate(tempDate.getDate() + 1);
      else if (timeUnit === "week") tempDate.setDate(tempDate.getDate() + 7);
      else if (timeUnit === "month") tempDate.setMonth(tempDate.getMonth() + 1);
      
      if (tempDate > endDate && formatDateK(tempDate) === key) break; // safety
    }

    // 3. Top products & Best performing category
    const revenueMatchStage = {
      createdAt: { $gte: currentStartDate },
      "paymentResult.status": "succeeded",
      status: { $ne: "cancelled" },
    };

    const topProductsAgg = await Order.aggregate([
      { $match: revenueMatchStage },
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
      { $limit: 8 },
    ]);

    const productIds = topProductsAgg.map((p) => p._id);
    const productsData = await Product.find({ _id: { $in: productIds } }, "stock").lean();
    const stockMap = {};
    productsData.forEach((p) => { stockMap[p._id.toString()] = p.stock; });

    const topProducts = topProductsAgg.map((p) => ({
      _id: p._id,
      name: p.productName,
      image: p.productImage,
      unitsSold: p.totalUnitsSold,
      revenue: parseFloat(p.totalRevenue.toFixed(2)),
      stock: stockMap[p._id.toString()] ?? 0,
    }));

    const categoryAgg = await Order.aggregate([
      { $match: revenueMatchStage },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.category",
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
          unitsSold: { $sum: "$orderItems.quantity" },
          productCount: { $addToSet: "$orderItems.product" },
        },
      },
      {
        $project: {
          category: "$_id",
          revenue: 1,
          unitsSold: 1,
          productCount: { $size: "$productCount" },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    const bestCategory = categoryAgg[0] || null;

    res.status(200).json({
      summary,
      chartData: paddedChartData,
      topProducts,
      topCategories: categoryAgg.slice(0, 5),
      insights: {
        bestCategory,
        periodLabel: groupLabel
      },
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

// GET /api/admin/restock-suggestions
export async function getRestockSuggestions(req, res) {
  try {
    const products = await Product.find({}, "name stock price images category lowStockThreshold").lean();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 30-day sales velocity from confirmed orders only
    const salesAggregation = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: thirtyDaysAgo },
          "paymentResult.status": "succeeded",
          status: { $ne: "cancelled" },
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
      salesMap[item._id.toString()] = item.totalQuantitySold;
    });

    const suggestions = [];

    products.forEach((product) => {
      const totalSold30d = salesMap[product._id.toString()] || 0;
      const avgDailySales = totalSold30d / 30;
      const daysRemaining = avgDailySales > 0 ? product.stock / avgDailySales : Infinity;
      const threshold = product.lowStockThreshold !== undefined ? product.lowStockThreshold : 10;

      // Only include items that need attention
      const needsRestock = product.stock <= 0 || product.stock <= threshold || (avgDailySales > 0 && daysRemaining <= 14);
      if (!needsRestock) return;

      // Compute priority
      let priority;
      let priorityScore;
      if (product.stock <= 0) {
        priority = "Critical";
        priorityScore = 4;
      } else if (daysRemaining <= 3) {
        priority = "Critical";
        priorityScore = 4;
      } else if (daysRemaining <= 7 || product.stock <= threshold) {
        priority = "High";
        priorityScore = 3;
      } else if (daysRemaining <= 14) {
        priority = "Medium";
        priorityScore = 2;
      } else {
        priority = "Low";
        priorityScore = 1;
      }

      // Suggested restock: 30-day supply target minus current stock
      const targetStock = Math.ceil(avgDailySales * 30);
      const suggestedQty = Math.max(targetStock - product.stock, threshold);

      suggestions.push({
        _id: product._id,
        name: product.name,
        category: product.category,
        currentStock: product.stock,
        price: product.price,
        image: product.images?.[0],
        avgDailySales: parseFloat(avgDailySales.toFixed(2)),
        totalSold30d,
        daysRemaining: daysRemaining === Infinity ? "N/A" : Math.floor(daysRemaining),
        priority,
        priorityScore,
        suggestedRestockQty: suggestedQty,
        estimatedRestockCost: parseFloat((suggestedQty * product.price).toFixed(2)),
      });
    });

    // Sort by priority descending
    suggestions.sort((a, b) => b.priorityScore - a.priorityScore);

    // Summary counts
    const summary = {
      critical: suggestions.filter((s) => s.priority === "Critical").length,
      high: suggestions.filter((s) => s.priority === "High").length,
      medium: suggestions.filter((s) => s.priority === "Medium").length,
      total: suggestions.length,
      totalEstimatedCost: parseFloat(
        suggestions.reduce((sum, s) => sum + s.estimatedRestockCost, 0).toFixed(2)
      ),
    };

    res.status(200).json({ suggestions, summary });
  } catch (error) {
    console.error("Error fetching restock suggestions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ==========================================
// REVIEW MANAGEMENT
// ==========================================

// GET /api/admin/reviews
export async function getAdminReviews(req, res) {
  try {
    const { status, rating, page = 1, limit = 20, search } = req.query;

    const filter = {};
    if (status && status !== "All") filter.status = status;
    if (rating && rating !== "All") filter.rating = parseInt(rating);
    
    if (search) {
      // Search by product name or user name/email
      const productIds = await Product.find({ name: { $regex: search, $options: "i" } }).distinct("_id");
      const userIds = await User.find({ 
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } }
        ]
      }).distinct("_id");

      filter.$or = [
        { productId: { $in: productIds } },
        { userId: { $in: userIds } },
        { comment: { $regex: search, $options: "i" } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate("userId", "name email imageUrl")
        .populate("productId", "name images price")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(filter),
    ]);

    res.status(200).json({
      reviews,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error in getAdminReviews:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// PATCH /api/admin/reviews/:id/status
export async function updateReviewStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["published", "hidden", "flagged"].includes(status)) {
      return res.status(400).json({ error: "Invalid status. Must be published, hidden, or flagged" });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: "Review not found" });
    }

    const oldStatus = review.status;
    review.status = status;
    await review.save();

    // Populate for frontend refresh
    const updatedReview = await Review.findById(review._id)
      .populate("userId", "name email imageUrl")
      .populate("productId", "name images price");

    // Recalculate product rating if visibility changed
    const wasPublic = oldStatus === "published";
    const isNowPublic = status === "published";
    if (wasPublic !== isNowPublic) {
      const stats = await Review.aggregate([
        { $match: { productId: review.productId, status: "published" } },
        {
          $group: {
            _id: null,
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ]);
      const averageRating = stats[0]?.averageRating || 0;
      const reviewCount = stats[0]?.reviewCount || 0;
      await Product.findByIdAndUpdate(review.productId, { averageRating, reviewCount });
    }

    res.status(200).json({ message: "Review status updated", review: updatedReview });
  } catch (error) {
    console.error("Error in updateReviewStatus:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

// GET /api/admin/review-analytics
export async function getReviewAnalytics(req, res) {
  try {
    // Overall summary (from published reviews only for public average)
    const reviewSummaryAgg = await Review.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
    ]);
    const totalReviews = await Review.countDocuments();
    const flaggedCount = await Review.countDocuments({ status: "flagged" });

    // Rating distribution
    const distributionAgg = await Review.aggregate([
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    distributionAgg.forEach((d) => {
      ratingDistribution[d._id] = d.count;
    });

    // Top reviewed products (by published review count)
    const topReviewedProducts = await Review.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$productId",
          reviewCount: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { reviewCount: -1, avgRating: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          image: { $arrayElemAt: ["$product.images", 0] },
          reviewCount: 1,
          avgRating: { $round: ["$avgRating", 1] },
        },
      },
    ]);

    // Top rated products (by average rating, min 3 reviews)
    const topRatedProducts = await Review.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$productId",
          reviewCount: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
      { $match: { reviewCount: { $gte: 1 } } }, // In dev, 1 is fine
      { $sort: { avgRating: -1, reviewCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          image: { $arrayElemAt: ["$product.images", 0] },
          reviewCount: 1,
          avgRating: { $round: ["$avgRating", 1] },
        },
      },
    ]);

    // Low rated products
    const lowRatedProducts = await Review.aggregate([
      { $match: { status: "published" } },
      {
        $group: {
          _id: "$productId",
          reviewCount: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
      { $match: { avgRating: { $lte: 2.5 } } },
      { $sort: { avgRating: 1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      {
        $project: {
          name: "$product.name",
          image: { $arrayElemAt: ["$product.images", 0] },
          reviewCount: 1,
          avgRating: { $round: ["$avgRating", 1] },
        },
      },
    ]);

    // Products with no reviews
    const reviewedProductIds = await Review.distinct("productId");
    const noReviewProducts = await Product.find(
      { _id: { $nin: reviewedProductIds } },
      "name images"
    )
      .limit(10)
      .lean();

    res.status(200).json({
      summary: {
        totalReviews: reviewSummaryAgg[0]?.totalReviews || 0,
        averageRating: parseFloat((reviewSummaryAgg[0]?.averageRating || 0).toFixed(1)),
        flaggedCount,
      },
      ratingDistribution,
      topReviewedProducts,
      topRatedProducts,
      lowRatedProducts,
      noReviewProducts: noReviewProducts.map((p) => ({
        _id: p._id,
        name: p.name,
        image: p.images?.[0],
      })),
    });
  } catch (error) {
    console.error("Error in getReviewAnalytics:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}