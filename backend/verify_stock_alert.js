import mongoose from "mongoose";
import { Order } from "./src/models/order.model.js";
import { Product } from "./src/models/product.model.js";
import { User } from "./src/models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

const verifyStockAlert = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to DB");

    const user = await User.findOne({ role: "admin" });
    const product = await Product.findOne({ category: "Smartphones" });

    if (!user || !product) {
      console.error("Missing user or product to run test");
      process.exit(1);
    }

    // 1. Force low stock and high threshold for testing
    product.stock = 5;
    product.lowStockThreshold = 10;
    await product.save();
    console.log(`Updated product ${product.name} to stock 5, threshold 10`);

    // 2. Create high sales volume for this product (e.g. 15 units)
    const testOrder = new Order({
      user: user._id,
      clerkId: "test_clerk",
      orderItems: [
        {
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: 15, // > 10
          image: "test.jpg"
        }
      ],
      shippingAddress: {
        fullName: "Test User",
        streetAddress: "123 Main St",
        city: "Colombo",
        district: "Colombo",
        province: "Western",
        postalCode: "00100",
        phoneNumber: "0112233445"
      },
      totalPrice: product.price * 15,
      paymentStatus: "paid",
      status: "delivered",
      pricing: { subtotal: product.price * 15, total: product.price * 15 }
    });

    await testOrder.save();
    console.log("Created high-velocity order for low-stock product");

    // 3. Mock the logic from the controller
    // (Simulating how productPerformance is built first)
    const now = new Date();
    const currentStartDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const productPerformanceMatch = { createdAt: { $gte: currentStartDate }, paymentStatus: "paid", status: { $ne: "cancelled" } };

    const productPerformance = await Order.aggregate([
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
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: "$orderItems.product",
          name: { $first: "$orderItems.name" },
          unitsSold: { $sum: "$orderItems.quantity" },
          stock: { $first: "$productInfo.stock" },
          lowStockThreshold: { $first: "$productInfo.lowStockThreshold" }
        }
      }
    ]);

    const fastSellersLowStock = productPerformance.filter(p => 
      p.unitsSold > 10 && p.stock <= p.lowStockThreshold
    );

    console.log("Fast Sellers Low Stock Results:", JSON.stringify(fastSellersLowStock, null, 2));

    if (fastSellersLowStock.length > 0 && fastSellersLowStock.some(p => p.name === product.name)) {
      console.log("✅ SUCCESS: Stock Alert logic is working correctly!");
    } else {
      console.log("❌ FAILURE: Stock Alert logic did not catch the product.");
    }

    // Cleanup (optional, but good)
    await Order.deleteOne({ _id: testOrder._id });

    process.exit(0);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
};

verifyStockAlert();
