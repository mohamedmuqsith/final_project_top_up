import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import { User } from "../../models/user.model.js";

// @desc    Get dashboard summary stats
export const getDashboardStats = async (req, res) => {
  try {
    const [totalOrders, totalProducts, totalCustomers] = await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "customer" })
    ]);

    const revenueAgg = await Order.aggregate([
      { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$totalPrice" } } }
    ]);

    res.status(200).json({
      totalOrders,
      totalProducts,
      totalCustomers,
      totalRevenue: revenueAgg[0]?.total || 0
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
    let currentStartDate, previousStartDate, dateFormat, groupLabel, timeUnit;

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
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 30);
      previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - 30);
      dateFormat = "%Y-%m-%d";
      groupLabel = "daily";
      timeUnit = "day";
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

    // Top Products
    const topProducts = await Order.aggregate([
      { $match: { createdAt: { $gte: currentStartDate }, paymentStatus: "paid", status: { $ne: "cancelled" } } },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.productId",
          name: { $first: "$orderItems.name" },
          image: { $first: "$orderItems.image" },
          unitsSold: { $sum: "$orderItems.quantity" },
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } }
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
          localField: "orderItems.productId",
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
          productCount: { $addToSet: "$orderItems.productId" }
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

// @desc    Get inventory report
export const getInventoryReport = async (req, res) => {
  try {
    const inventoryAgg = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalInventoryValue: { $sum: { $multiply: ["$stock", "$price"] } },
          totalUnitsInStock: { $sum: "$stock" },
          outOfStockCount: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } }
        }
      }
    ]);
    res.status(200).json(inventoryAgg[0] || {});
  } catch (error) {
    console.error("Error in getInventoryReport:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get restock suggestions
export const getRestockSuggestions = async (req, res) => {
  try {
    const products = await Product.find({ stock: { $lte: 10 } });
    res.status(200).json(products);
  } catch (error) {
    console.error("Error in getRestockSuggestions:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
