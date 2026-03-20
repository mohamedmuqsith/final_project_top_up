import { User } from "../../models/user.model.js";
import { Order } from "../../models/order.model.js";

// @desc    Get all customers
// @route   GET /api/admin/customers
export const getAllCustomers = async (req, res) => {
  try {
    const { search, segment, minSpend, maxSpend, minOrders } = req.query;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const pipeline = [
      { $match: { role: "user" } }, // Model uses "user", not "customer"
    ];

    // Basic User Filter (Search)
    if (search) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } }
          ]
        }
      });
    }

    // Join with Orders
    pipeline.push({
      $lookup: {
        from: "orders",
        localField: "_id",
        foreignField: "user",
        as: "orders"
      }
    });

    // Calculate Stats
    pipeline.push({
      $addFields: {
        orderStats: {
          totalOrders: { $size: "$orders" },
          totalSpend: {
            $reduce: {
              input: "$orders",
              initialValue: 0,
              in: {
                $cond: [
                  { $and: [
                    { $eq: ["$$this.paymentStatus", "paid"] },
                    { $ne: ["$$this.status", "cancelled"] }
                  ]},
                  { $add: ["$$value", "$$this.totalPrice"] },
                  "$$value"
                ]
              }
            }
          },
          lastOrderDate: { $max: "$orders.createdAt" }
        }
      }
    });

    // Calculate Segment
    pipeline.push({
      $addFields: {
        segment: {
          $switch: {
            branches: [
              { case: { $gte: ["$orderStats.totalSpend", 500] }, then: "VIP" },
              { case: { $gte: ["$orderStats.totalOrders", 3] }, then: "Repeat" },
              { 
                case: { 
                  $and: [
                    { $gt: ["$orderStats.totalOrders", 0] },
                    { $lt: ["$orderStats.lastOrderDate", thirtyDaysAgo] }
                  ] 
                }, 
                then: "At-Risk" 
              }
            ],
            default: "New"
          }
        }
      }
    });

    // Post-Aggregation Filters
    const postFilter = {};
    if (segment && segment !== "All") postFilter.segment = segment;
    if (minSpend) postFilter["orderStats.totalSpend"] = { $gte: Number(minSpend) };
    if (maxSpend) postFilter["orderStats.totalSpend"] = { $lte: Number(maxSpend) };
    if (minOrders) postFilter["orderStats.totalOrders"] = { $gte: Number(minOrders) };

    if (Object.keys(postFilter).length > 0) {
      pipeline.push({ $match: postFilter });
    }

    // Project essential fields
    pipeline.push({
      $project: {
        orders: 0, // Remove large array
        clerkId: 0,
        stripeCustomerId: 0
      }
    });

    pipeline.push({ $sort: { createdAt: -1 } });

    const customers = await User.aggregate(pipeline);
    res.status(200).json({ customers });
  } catch (error) {
    console.error("Error in getAllCustomers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get customer stats
// @route   GET /api/admin/customers/:id/stats
export const getCustomerStats = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "Customer not found" });

    const orders = await Order.find({ user: id }).sort({ createdAt: -1 });
    
    // Calculate total spend (only paid orders)
    const paidOrders = orders.filter(o => o.paymentStatus === "paid" && o.status !== "cancelled");
    const totalSpend = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    // Calculate Top Category
    const categoryCounts = {};
    paidOrders.forEach(order => {
      order.orderItems.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + item.quantity;
      });
    });
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "None";

    // Calculate Segment (Local Logic matches getAllCustomers)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const lastOrderDate = orders[0]?.createdAt;
    
    let segment = "New";
    if (totalSpend >= 500) segment = "VIP";
    else if (orders.length >= 3) segment = "Repeat";
    else if (orders.length > 0 && lastOrderDate < thirtyDaysAgo) segment = "At-Risk";

    // Inject segment into user object for frontend convenience
    const userWithSegment = user.toObject();
    userWithSegment.segment = segment;

    res.status(200).json({
      customer: userWithSegment,
      stats: {
        totalOrders: orders.length,
        totalSpend: parseFloat(totalSpend.toFixed(2)),
        topCategory,
        lastOrderDate,
        orderHistory: orders.slice(0, 10) // Matches modal's expectation
      }
    });
  } catch (error) {
    console.error("Error in getCustomerStats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
