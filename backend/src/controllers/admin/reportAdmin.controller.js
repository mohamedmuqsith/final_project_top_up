import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import { User } from "../../models/user.model.js";
import { Review } from "../../models/review.model.js";

// @desc    Get dashboard summary stats
export const getDashboardStats = async (req, res) => {
  try {
    const { timeRange = "weekly" } = req.query;
    const now = new Date();
    
    // 1. Basic Counts
    const [
      totalOrders, 
      totalProducts, 
      totalCustomers, 
      totalAdmins, 
      categories,
      reviewStats
    ] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "user" }),
      User.countDocuments({ role: "admin" }),
      Product.distinct("category"),
      Review.aggregate([
        { $group: { _id: null, totalReviews: { $sum: 1 }, averageRating: { $avg: "$rating" } } }
      ])
    ]);

    // 2. Revenue & Sales Logic (Paid, Non-Cancelled)
    const revenueMatch = { paymentStatus: "paid", status: { $ne: "cancelled" } };
    
    const [revenueAgg, cancelledCount, confirmedCount] = await Promise.all([
      Order.aggregate([
        { $match: revenueMatch },
        { $group: { _id: null, total: { $sum: "$totalPrice" } } }
      ]),
      Order.countDocuments({ status: "cancelled" }),
      Order.countDocuments(revenueMatch)
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;
    const cancellationRate = totalOrders > 0 ? ((cancelledCount / totalOrders) * 100).toFixed(1) : 0;

    // 3. Status Breakdown
    const statusAgg = await Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    const statusMap = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };
    statusAgg.forEach(item => {
      if (statusMap.hasOwnProperty(item._id)) {
        statusMap[item._id] = item.count;
      }
    });

    // 4. Recent Orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("_id shippingAddress.fullName orderItems totalPrice status createdAt");

    // 5. Chart Data (Time Range aware)
    let dateFormat, matchDate;
    if (timeRange === "daily") {
      matchDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
      dateFormat = "%Y-%m-%d";
    } else if (timeRange === "monthly") {
      matchDate = new Date(now.getFullYear(), 0, 1); // YTD
      dateFormat = "%Y-%m";
    } else {
      // weekly
      matchDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days
      dateFormat = "%Y-W%U";
    }

    const chartData = await Order.aggregate([
      { $match: { createdAt: { $gte: matchDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: { 
            $sum: { 
              $cond: [
                { $and: [{ $eq: ["$paymentStatus", "paid"] }, { $ne: ["$status", "cancelled"] }] },
                "$totalPrice",
                0
              ] 
            } 
          },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } },
      { $project: { _id: 0, date: "$_id", revenue: 1, orders: 1 } }
    ]);

    // 6. Inventory: Low Stock & Predicted Stockouts
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$stock", "$lowStockThreshold"] }
    }).limit(5).select("_id name images stock price");
    
    // Process images for frontend (array -> string if needed)
    const formattedLowStock = lowStockProducts.map(p => ({
      _id: p._id,
      name: p.name,
      image: p.images?.[0] || "/placeholder.jpg",
      stock: p.stock
    }));

    // Predictive Stockouts (Based on 30-day velocity)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const velocityAgg = await Order.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo }, status: { $ne: "cancelled" } } },
      { $unwind: "$orderItems" },
      { $group: { _id: "$orderItems.product", unitsSold: { $sum: "$orderItems.quantity" } } }
    ]);

    const velocityMap = new Map(velocityAgg.map(v => [v._id.toString(), v.unitsSold]));
    
    const allProducts = await Product.find({ stock: { $gt: 0 } }).select("_id name stock images");
    const predictedStockouts = allProducts
      .map(p => {
        const unitsSold30d = velocityMap.get(p._id.toString()) || 0;
        const avgDailyUnitsSold = unitsSold30d / 30;
        if (avgDailyUnitsSold === 0) return null;
        
        const daysRemaining = Math.floor(p.stock / avgDailyUnitsSold);
        return {
          _id: p._id,
          name: p.name,
          stock: p.stock,
          avgDailyUnitsSold: parseFloat(avgDailyUnitsSold.toFixed(2)),
          daysRemaining: daysRemaining
        };
      })
      .filter(p => p !== null && p.daysRemaining <= 7)
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5);

    res.status(200).json({
      totalRevenue,
      totalOrders,
      confirmedSales: confirmedCount,
      cancelledOrders: cancelledCount,
      cancellationRate,
      totalCustomers,
      totalAdmins,
      totalProducts,
      totalCategories: categories.length,
      recentOrders,
      lowStockProducts: formattedLowStock,
      predictedStockouts,
      chartData,
      statusMap,
      reviewSummary: {
        totalReviews: reviewStats[0]?.totalReviews || 0,
        averageRating: parseFloat((reviewStats[0]?.averageRating || 0).toFixed(1))
      }
    });
  } catch (error) {
    console.error("Error in getDashboardStats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get sales report with time series and comparisons
export const getSalesReport = async (req, res) => {
  try {
    const { range } = req.query; // 30d, 90d, ytd
    const now = new Date();
    let currentStartDate, previousStartDate, dateFormat, groupLabel;

    if (range === "90d") {
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 90);
      previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - 90);
      dateFormat = "%Y-W%U";
      groupLabel = "weekly";
    } else if (range === "ytd") {
      currentStartDate = new Date(now.getFullYear(), 0, 1);
      previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
      dateFormat = "%Y-%m";
      groupLabel = "monthly";
    } else {
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 30);
      previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - 30);
      dateFormat = "%Y-%m-%d";
      groupLabel = "daily";
    }

    const getSummary = async (start, end) => {
      const match = { createdAt: { $gte: start } };
      if (end) match.createdAt.$lt = end;

      const agg = await Order.aggregate([
        {
          $facet: {
            revenueStats: [
              { $match: { ...match, paymentStatus: "paid", status: { $ne: "cancelled" } } },
              { $group: { _id: null, totalRevenue: { $sum: "$totalPrice" }, totalConfirmedSales: { $sum: 1 } } }
            ],
            totalStats: [
              { $match: match },
              { $group: { _id: null, totalOrders: { $sum: 1 }, cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } } } }
            ]
          }
        },
        {
          $project: {
            totalRevenue: { $ifNull: [{ $arrayElemAt: ["$revenueStats.totalRevenue", 0] }, 0] },
            totalConfirmedSales: { $ifNull: [{ $arrayElemAt: ["$revenueStats.totalConfirmedSales", 0] }, 0] },
            totalOrders: { $ifNull: [{ $arrayElemAt: ["$totalStats.totalOrders", 0] }, 0] },
            cancelledOrders: { $ifNull: [{ $arrayElemAt: ["$totalStats.cancelledOrders", 0] }, 0] }
          }
        }
      ]);
      return agg[0] || { totalRevenue: 0, totalConfirmedSales: 0, totalOrders: 0, cancelledOrders: 0 };
    };

    const currentSummary = await getSummary(currentStartDate);
    const previousSummary = await getSummary(previousStartDate, currentStartDate);

    const calcChange = (curr, prev) => (prev ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0));

    const avgOrderValue = currentSummary.totalConfirmedSales ? (currentSummary.totalRevenue / currentSummary.totalConfirmedSales) : 0;
    const prevAvgOrderValue = previousSummary.totalConfirmedSales ? (previousSummary.totalRevenue / previousSummary.totalConfirmedSales) : 0;
    const cancellationRate = currentSummary.totalOrders ? ((currentSummary.cancelledOrders / currentSummary.totalOrders) * 100) : 0;
    const prevCancellationRate = previousSummary.totalOrders ? ((previousSummary.cancelledOrders / previousSummary.totalOrders) * 100) : 0;

    // Get Chart Data
    const chartData = await Order.aggregate([
      { $match: { createdAt: { $gte: currentStartDate }, paymentStatus: "paid", status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: { $sum: "$totalPrice" },
          orders: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } },
      { $project: { _id: 0, date: "$_id", revenue: 1, orders: 1 } }
    ]);

    // Top Products (Corrected productId -> product in Phase 9)
    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: currentStartDate }, paymentStatus: "paid", status: { $ne: "cancelled" } } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          name: { $first: "$orderItems.name" },
          image: { $first: "$orderItems.image" },
          unitsSold: { $sum: "$orderItems.quantity" },
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } }
        }
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          unitsSold: 1,
          revenue: 1,
          stock: "$productInfo.stock"
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 5 }
    ]);

    // Top Categories
    const topCategories = await Order.aggregate([
      { $match: { createdAt: { $gte: currentStartDate }, paymentStatus: "paid", status: { $ne: "cancelled" } } },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: "$productInfo.category",
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
          unitsSold: { $sum: "$orderItems.quantity" },
          productCount: { $addToSet: "$orderItems.product" }
        }
      },
      { $project: { _id: 0, category: "$_id", revenue: 1, unitsSold: 1, productCount: { $size: "$productCount" } } },
      { $sort: { revenue: -1 } }
    ]);

    res.status(200).json({
      summary: {
        totalRevenue: parseFloat(currentSummary.totalRevenue.toFixed(2)),
        totalOrders: currentSummary.totalOrders,
        totalConfirmedSales: currentSummary.totalConfirmedSales,
        cancelledOrders: currentSummary.cancelledOrders,
        cancellationRate: parseFloat(cancellationRate.toFixed(1)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        comparison: {
          revenueChange: parseFloat(calcChange(currentSummary.totalRevenue, previousSummary.totalRevenue).toFixed(1)),
          ordersChange: parseFloat(calcChange(currentSummary.totalOrders, previousSummary.totalOrders).toFixed(1)),
          avgOrderValueChange: parseFloat(calcChange(avgOrderValue, prevAvgOrderValue).toFixed(1)),
          cancellationRateChange: parseFloat(calcChange(cancellationRate, prevCancellationRate).toFixed(1))
        }
      },
      chartData,
      topProducts,
      topCategories,
      insights: {
        bestCategory: topCategories[0] || null,
        periodLabel: groupLabel
      },
      range
    });
  } catch (error) {
    console.error("Error in getSalesReport:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get inventory report with categorical distribution and stock lists
// @route   GET /api/admin/inventory-report
export const getInventoryReport = async (req, res) => {
  try {
    // 1. Summary Metrics
    const summaryAgg = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalInventoryValue: { $sum: { $multiply: ["$stock", "$price"] } },
          totalUnitsInStock: { $sum: "$stock" },
          outOfStockCount: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } }
        }
      }
    ]);

    const summary = summaryAgg[0] || { totalInventoryValue: 0, totalUnitsInStock: 0, outOfStockCount: 0 };

    // 2. Stock by Category (for Charts)
    const categoryAgg = await Product.aggregate([
      {
        $group: {
          _id: "$category",
          units: { $sum: "$stock" },
          value: { $sum: { $multiply: ["$stock", "$price"] } },
          productCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          name: { $ifNull: ["$_id", "Uncategorized"] },
          units: 1,
          value: 1,
          productCount: 1
        }
      },
      { $sort: { value: -1 } }
    ]);

    // 3. Stock Lists
    const [outOfStockList, lowStockListRaw] = await Promise.all([
      Product.find({ stock: { $lte: 0 } })
        .select("name category price stock")
        .sort({ name: 1 })
        .limit(50),
      Product.find({ 
        $expr: { $lte: ["$stock", "$lowStockThreshold"] },
        stock: { $gt: 0 }
      })
        .select("name category stock lowStockThreshold")
        .sort({ stock: 1 })
        .limit(50)
    ]);

    // Map lowStockThreshold to threshold as expected by UI
    const lowStockList = lowStockListRaw.map(p => ({
      _id: p._id,
      name: p.name,
      category: p.category,
      stock: p.stock,
      threshold: p.lowStockThreshold || 10
    }));

    res.status(200).json({
      summary: {
        totalInventoryValue: parseFloat(summary.totalInventoryValue.toFixed(2)),
        totalUnitsInStock: summary.totalUnitsInStock,
        outOfStockCount: summary.outOfStockCount
      },
      stockByCategory: categoryAgg,
      outOfStockList,
      lowStockList
    });
  } catch (error) {
    console.error("Error in getInventoryReport:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
