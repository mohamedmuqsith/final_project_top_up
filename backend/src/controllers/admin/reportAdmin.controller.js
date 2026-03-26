import { Order } from "../../models/order.model.js";
import { Product } from "../../models/product.model.js";
import { User } from "../../models/user.model.js";
import { Review } from "../../models/review.model.js";
import { InventoryService } from "../../services/inventory.service.js";

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

    // 6. Inventory: Low Stock & Predicted Stockouts (Refactored to use centralized engine)
    const predictions = await InventoryService.calculateStockPredictions({ lookbackDays: 30 });
    
    const formattedLowStock = predictions
      .filter(p => p.alertType === "Low Stock" || p.alertType === "Out of Stock")
      .slice(0, 5)
      .map(p => ({
        _id: p.productId,
        name: p.name,
        image: p.image,
        stock: p.currentStock
      }));

    const predictedStockouts = predictions
      .filter(p => p.alertType === "Predicted Stockout")
      .sort((a, b) => a.daysRemaining - b.daysRemaining)
      .slice(0, 5)
      .map(p => ({
        _id: p.productId,
        name: p.name,
        stock: p.currentStock,
        avgDailyUnitsSold: p.avgDailySales,
        daysRemaining: p.daysRemaining
      }));

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
    const { 
      range, 
      startDate: queryStartDate, 
      endDate: queryEndDate, 
      category, 
      brand, 
      orderStatus, 
      paymentMethod,
      search 
    } = req.query;

    const now = new Date();
    let currentStartDate, currentEndDate = now, previousStartDate, dateFormat, groupLabel;

    // 1. Time Range Logic
    if (queryStartDate && queryEndDate) {
      currentStartDate = new Date(queryStartDate);
      currentEndDate = new Date(queryEndDate);
      const diffDays = Math.ceil(Math.abs(currentEndDate - currentStartDate) / (1000 * 60 * 60 * 24)) || 1;
      previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - diffDays);
      dateFormat = "%Y-%m-%d";
      groupLabel = "custom";
    } else if (range === "90d") {
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
      // Default 30d
      currentStartDate = new Date(now);
      currentStartDate.setDate(currentStartDate.getDate() - 30);
      previousStartDate = new Date(currentStartDate);
      previousStartDate.setDate(previousStartDate.getDate() - 30);
      dateFormat = "%Y-%m-%d";
      groupLabel = "daily";
    }

    // 2. Base Match Filter for Orders
    const buildOrderMatch = (start, end) => {
      const match = { createdAt: { $gte: start } };
      if (end) match.createdAt.$lte = end;
      if (orderStatus && orderStatus !== "All") match.status = orderStatus;
      if (paymentMethod && paymentMethod !== "All") match.paymentMethod = paymentMethod;
      return match;
    };

    const currentOrderMatch = buildOrderMatch(currentStartDate, currentEndDate);
    const previousOrderMatch = buildOrderMatch(previousStartDate, currentStartDate);

    // 3. Summary Aggregation Helper (Dry)
    const getDetailedSummary = async (match) => {
      const agg = await Order.aggregate([
        {
          $facet: {
            revenueStats: [
              { $match: { ...match, paymentStatus: "paid", status: { $ne: "cancelled" } } },
              { $group: { 
                _id: null, 
                netRevenue: { $sum: "$totalPrice" }, 
                confirmedSales: { $sum: 1 },
                itemsSold: { $sum: { $sum: "$orderItems.quantity" } }
              } }
            ],
            grossStats: [
              { $match: match },
              { $group: { 
                _id: null, 
                grossRevenue: { $sum: "$totalPrice" }, 
                totalOrders: { $sum: 1 }, 
                cancelledOrders: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
                refundedCount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, 1, 0] } },
                refundAmount: { $sum: { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$totalPrice", 0] } },
                returnedCount: { $sum: { $cond: [{ $eq: ["$status", "returned"] }, 1, 0] } }
              } }
            ]
          }
        },
        {
          $project: {
            netRevenue: { $ifNull: [{ $arrayElemAt: ["$revenueStats.netRevenue", 0] }, 0] },
            confirmedSales: { $ifNull: [{ $arrayElemAt: ["$revenueStats.confirmedSales", 0] }, 0] },
            itemsSold: { $ifNull: [{ $arrayElemAt: ["$revenueStats.itemsSold", 0] }, 0] },
            grossRevenue: { $ifNull: [{ $arrayElemAt: ["$grossStats.grossRevenue", 0] }, 0] },
            totalOrders: { $ifNull: [{ $arrayElemAt: ["$grossStats.totalOrders", 0] }, 0] },
            cancelledOrders: { $ifNull: [{ $arrayElemAt: ["$grossStats.cancelledOrders", 0] }, 0] },
            refundedCount: { $ifNull: [{ $arrayElemAt: ["$grossStats.refundedCount", 0] }, 0] },
            refundAmount: { $ifNull: [{ $arrayElemAt: ["$grossStats.refundAmount", 0] }, 0] },
            returnedCount: { $ifNull: [{ $arrayElemAt: ["$grossStats.returnedCount", 0] }, 0] }
          }
        }
      ]);
      return agg[0] || { netRevenue: 0, confirmedSales: 0, itemsSold: 0, grossRevenue: 0, totalOrders: 0, cancelledOrders: 0, refundedCount: 0, refundAmount: 0, returnedCount: 0 };
    };

    const currentSummary = await getDetailedSummary(currentOrderMatch);
    const previousSummary = await getDetailedSummary(previousOrderMatch);

    const calcChange = (curr, prev) => (prev ? ((curr - prev) / prev) * 100 : (curr > 0 ? 100 : 0));

    const avgOrderValue = currentSummary.confirmedSales ? (currentSummary.netRevenue / currentSummary.confirmedSales) : 0;
    const prevAvgOrderValue = previousSummary.confirmedSales ? (previousSummary.netRevenue / previousSummary.confirmedSales) : 0;
    const cancellationRate = currentSummary.totalOrders ? ((currentSummary.cancelledOrders / currentSummary.totalOrders) * 100) : 0;
    const prevCancellationRate = previousSummary.totalOrders ? ((previousSummary.cancelledOrders / previousSummary.totalOrders) * 100) : 0;

    // 4. Time Series Chart Data
    const chartData = await Order.aggregate([
      { $match: { ...currentOrderMatch, paymentStatus: "paid", status: { $ne: "cancelled" } } },
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

    // 5. Product Performance Aggregation (REAL Order Items)
    const productPerformanceMatch = { ...currentOrderMatch, paymentStatus: "paid", status: { $ne: "cancelled" } };
    
    // 5. Unified Product, Brand, & Category Performance Aggregation
    const baseAggPipeline = [
      { $match: productPerformanceMatch },
      { $unwind: "$orderItems" },
      {
        $lookup: {
          from: "products",
          localField: "orderItems.product",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } }
    ];

    // Apply Filters at Item level
    const itemFilters = {};
    if (category && category !== "All") itemFilters["productInfo.category"] = category;
    if (brand && brand !== "All") itemFilters["productInfo.brand"] = brand;
    if (search) {
      itemFilters["$or"] = [
        { "orderItems.name": { $regex: search, $options: "i" } },
        { "productInfo.sku": { $regex: search, $options: "i" } },
        { "productInfo.brand": { $regex: search, $options: "i" } }
      ];
    }
    if (Object.keys(itemFilters).length > 0) {
      baseAggPipeline.push({ $match: itemFilters });
    }

    // A. Product-level Performance
    const productPerformance = await Order.aggregate([
      ...baseAggPipeline,
      {
        $group: {
          _id: "$orderItems.product",
          name: { $first: "$orderItems.name" },
          image: { $first: "$orderItems.image" },
          category: { $first: "$productInfo.category" },
          brand: { $first: "$productInfo.brand" },
          sku: { $first: "$productInfo.sku" },
          unitsSold: { $sum: "$orderItems.quantity" },
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
          totalPriceSum: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
          stock: { $first: "$productInfo.stock" },
          lowStockThreshold: { $first: "$productInfo.lowStockThreshold" }
        }
      },
      {
        $addFields: {
          avgPrice: { $cond: [{ $gt: ["$unitsSold", 0] }, { $divide: ["$revenue", "$unitsSold"] }, 0] },
          stockRisk: {
            $cond: [
              { $lte: ["$stock", 0] }, "Out of Stock",
              { $cond: [{ $lte: ["$stock", "$lowStockThreshold"] }, "Low Stock", "Healthy"] }
            ]
          }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // B. Brand-level Performance (including Device Type Logic)
    const brandSales = await Order.aggregate([
      ...baseAggPipeline,
      {
        $group: {
          _id: { $ifNull: ["$productInfo.brand", "Unbranded"] },
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
          unitsSold: { $sum: "$orderItems.quantity" },
          productCount: { $addToSet: "$orderItems.product" },
          isApple: { $first: { $cond: [{ $eq: ["$productInfo.brand", "Apple"] }, 1, 0] } }
        }
      },
      {
        $project: {
          _id: 0,
          brand: "$_id",
          revenue: 1,
          unitsSold: 1,
          productCount: { $size: "$productCount" },
          share: {
            $cond: [
              { $gt: [currentSummary.netRevenue, 0] },
              { $multiply: [{ $divide: ["$revenue", currentSummary.netRevenue] }, 100] },
              0
            ]
          }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // C. Device Type Breakdown (iPhone vs Android)
    const deviceTypeStats = await Order.aggregate([
      ...baseAggPipeline,
      {
        $addFields: {
          deviceType: {
            $cond: [
              {
                $and: [
                  { $eq: ["$productInfo.brand", "Apple"] },
                  { $regexMatch: { input: "$orderItems.name", regex: /iPhone/i } }
                ]
              },
              "iPhone",
              {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$productInfo.brand", "Apple"] },
                      { $or: [
                        { $eq: ["$productInfo.category", "Smartphones"] },
                        { $eq: ["$productInfo.category", "Mobiles"] }
                      ]}
                    ]
                  },
                  "Android",
                  "Other"
                ]
              }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$deviceType",
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
          unitsSold: { $sum: "$orderItems.quantity" }
        }
      },
      { $project: { _id: 0, type: "$_id", revenue: 1, unitsSold: 1 } },
      { $sort: { revenue: -1 } }
    ]);

    // 6. Category Breakdown
    const categoryBreakdown = await Order.aggregate([
      ...baseAggPipeline,
      {
        $group: {
          _id: { $ifNull: ["$productInfo.category", "Uncategorized"] },
          revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
          unitsSold: { $sum: "$orderItems.quantity" },
          productCount: { $addToSet: "$orderItems.product" }
        }
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          revenue: 1,
          unitsSold: 1,
          productCount: { $size: "$productCount" },
          avgPrice: { $cond: [{ $gt: ["$unitsSold", 0] }, { $divide: ["$revenue", "$unitsSold"] }, 0] }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // 7. Status Breakdown
    const statusBreakdown = await Order.aggregate([
      { $match: { createdAt: { $gte: currentStartDate, $lte: currentEndDate } } },
      { $group: { _id: "$status", count: { $sum: 1 }, revenue: { $sum: "$totalPrice" } } },
      { $project: { _id: 0, status: "$_id", count: 1, revenue: 1 } }
    ]);

    // 8. Top/Low Performers
    const topSellers = productPerformance.slice(0, 8);
    const lowSellers = productPerformance.filter(p => p.unitsSold > 0).slice(-8).reverse();

    res.status(200).json({
      summary: {
        ...currentSummary,
        cancellationRate: parseFloat(cancellationRate.toFixed(1)),
        avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        comparison: {
          revenueChange: parseFloat(calcChange(currentSummary.netRevenue, previousSummary.netRevenue).toFixed(1)),
          ordersChange: parseFloat(calcChange(currentSummary.totalOrders, previousSummary.totalOrders).toFixed(1)),
          avgOrderValueChange: parseFloat(calcChange(avgOrderValue, prevAvgOrderValue).toFixed(1)),
          cancellationRateChange: parseFloat(calcChange(cancellationRate, prevCancellationRate).toFixed(1))
        }
      },
      chartData,
      productPerformance,
      categoryBreakdown: categoryBreakdown.map(cat => {
        const topProd = productPerformance.find(p => p.category === cat.category);
        return { ...cat, topProduct: topProd ? topProd.name : "N/A" };
      }),
      statusBreakdown,
      topSellers,
      lowSellers,
      brandSales,
      deviceTypeStats,
      insights: {
        bestCategory: categoryBreakdown[0] || null,
        periodLabel: groupLabel,
        bestDeviceType: deviceTypeStats[0] || null
      },
      range,
      filters: {
        startDate: currentStartDate,
        endDate: currentEndDate,
        category,
        brand,
        orderStatus,
        paymentMethod,
        search
      },
      performance: {
        slowMovers: productPerformance.filter(p => p.unitsSold < 3).slice(-5),
        fastSellersLowStock: productPerformance.filter(p => p.unitsSold > 10 && p.stock <= p.lowStockThreshold).slice(0, 5)
      }
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

    // 3. Stock Lists (Refactored to use centralized engine)
    const predictions = await InventoryService.calculateStockPredictions({ lookbackDays: 30 });

    const outOfStockList = predictions
      .filter(p => p.alertType === "Out of Stock")
      .map(p => ({
        _id: p.productId,
        name: p.name,
        category: p.category,
        price: p.price, // Wait, did I add price to predictions? Let me check.
        stock: 0
      }));

    const lowStockList = predictions
      .filter(p => p.alertType === "Low Stock")
      .map(p => ({
        _id: p.productId,
        name: p.name,
        category: p.category,
        stock: p.currentStock,
        threshold: p.lowStockThreshold
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
