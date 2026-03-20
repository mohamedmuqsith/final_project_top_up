import { User } from "../../models/user.model.js";
import { Order } from "../../models/order.model.js";

// @desc    Get all customers
// @route   GET /api/admin/customers
export const getAllCustomers = async (req, res) => {
  try {
    const { search, segment } = req.query;
    let query = { role: "customer" };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ];
    }

    // Segment logic could be complex (e.g. VIP based on spend)
    // For now, if segment is provided, we can filter or just return all
    // In a real app, segments might be stored on the user or calculated

    const customers = await User.find(query).sort({ createdAt: -1 });
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

    res.status(200).json({
      customer: user,
      orderCount: orders.length,
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      recentOrders: orders.slice(0, 5)
    });
  } catch (error) {
    console.error("Error in getCustomerStats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
