import mongoose from "mongoose";
import { Order } from "./src/models/order.model.js";
import { Product } from "./src/models/product.model.js";
import { User } from "./src/models/user.model.js";
import dotenv from "dotenv";

dotenv.config();

const verify = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("Connected to DB");

    // 1. Check if we have orders. If not, create some dummy ones.
    let orderCount = await Order.countDocuments();
    if (orderCount === 0) {
      console.log("No orders found. Creating dummy orders...");
      
      const user = await User.findOne({ role: "admin" });
      if (!user) {
        console.error("No admin user found to create orders");
        process.exit(1);
      }

      const products = await Product.find({ category: { $in: ["Smartphones", "Mobiles", "Laptops"] } }).limit(10);
      if (products.length === 0) {
        console.error("No products found to create orders. Run seed first.");
        process.exit(1);
      }

      const dummyOrders = [
        {
          user: user._id,
          clerkId: "test_clerk",
          orderItems: [
            {
              product: products.find(p => p.name.includes("iPhone"))._id,
              name: products.find(p => p.name.includes("iPhone")).name,
              price: products.find(p => p.name.includes("iPhone")).price,
              quantity: 2,
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
          totalPrice: products.find(p => p.name.includes("iPhone")).price * 2,
          paymentStatus: "paid",
          status: "delivered",
          pricing: { subtotal: products.find(p => p.name.includes("iPhone")).price * 2, total: products.find(p => p.name.includes("iPhone")).price * 2 }
        },
        {
          user: user._id,
          clerkId: "test_clerk",
          orderItems: [
            {
              product: products.find(p => p.name.includes("Samsung") || p.name.includes("Pixel"))._id,
              name: products.find(p => p.name.includes("Samsung") || p.name.includes("Pixel")).name,
              price: products.find(p => p.name.includes("Samsung") || p.name.includes("Pixel")).price,
              quantity: 3,
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
          totalPrice: products.find(p => p.name.includes("Samsung") || p.name.includes("Pixel")).price * 3,
          paymentStatus: "paid",
          status: "delivered",
          pricing: { subtotal: products.find(p => p.name.includes("Samsung") || p.name.includes("Pixel")).price * 3, total: products.find(p => p.name.includes("Samsung") || p.name.includes("Pixel")).price * 3 }
        }
      ];

      await Order.insertMany(dummyOrders);
      console.log("Dummy orders created");
    }

    // 2. Run the aggregation (simplified version of what's in controller)
    const deviceTypeStats = await Order.aggregate([
      { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
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
      }
    ]);

    console.log("Device Type Stats:", JSON.stringify(deviceTypeStats, null, 2));

    const brandSales = await Order.aggregate([
        { $match: { paymentStatus: "paid", status: { $ne: "cancelled" } } },
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
            _id: { $ifNull: ["$productInfo.brand", "Unbranded"] },
            revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } },
            unitsSold: { $sum: "$orderItems.quantity" }
          }
        }
      ]);
      
      console.log("Brand Sales:", JSON.stringify(brandSales, null, 2));

    process.exit(0);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
};

verify();
