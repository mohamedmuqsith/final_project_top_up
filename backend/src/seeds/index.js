import mongoose from "mongoose";
import { Product } from "../models/product.model.js";
import { ENV } from "../config/env.js";

const products = [
  {
    name: "Wireless ANC Headphones Pro",
    description:
      "Premium over-ear headphones with active noise cancellation, 40-hour battery life, and high-fidelity sound. Perfect for travel and deep focus.",
    price: 249.99,
    stock: 50,
    category: "Headphones",
    images: [
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500",
      "https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500",
    ],
    averageRating: 4.8,
    totalReviews: 312,
  },
  {
    name: "UltraBook Pro 15",
    description:
      "A high-performance laptop featuring a 15-inch OLED display, 16GB RAM, and a 1TB SSD. Ideal for creators and power users.",
    price: 1299.99,
    stock: 20,
    category: "Laptops",
    images: [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500",
    ],
    averageRating: 4.6,
    totalReviews: 185,
  },
  {
    name: "Galaxy Ultra Smartphone",
    description:
      "Flagship smartphone with a 108MP camera, all-day battery life, and an immersive 120Hz display.",
    price: 999.99,
    stock: 35,
    category: "Smartphones",
    images: [
      "https://images.unsplash.com/photo-1598327105666-5b89351cb31b?w=500",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500",
    ],
    averageRating: 4.9,
    totalReviews: 540,
  },
  {
    name: "Bluetooth Portable Speaker",
    description:
      "Waterproof, rugged bluetooth speaker delivering 360-degree sound. Up to 12 hours of playtime for your outdoor adventures.",
    price: 79.99,
    stock: 120,
    category: "Speakers",
    images: [
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500",
      "https://images.unsplash.com/photo-1589003077984-894e133dabab?w=500",
    ],
    averageRating: 4.4,
    totalReviews: 167,
  },
  {
    name: "Mechanical Gaming Keyboard",
    description:
      "Tactile mechanical switches with customizable per-key RGB lighting. Built for competitive gamers and typing enthusiasts.",
    price: 119.99,
    stock: 30,
    category: "Gaming",
    images: [
      "https://images.unsplash.com/photo-1595225476474-87563907a212?w=500",
      "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500",
    ],
    averageRating: 4.7,
    totalReviews: 421,
  },
  {
    name: "4K Action Camera",
    description:
      "Rugged and waterproof to 33ft. Shoots stunning 4K video with advanced stabilization for extreme sports and vlogging.",
    price: 299.99,
    stock: 45,
    category: "Cameras",
    images: [
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500",
      "https://images.unsplash.com/photo-1580210515124-780c1dfd4f0d?w=500"
    ],
    averageRating: 4.5,
    totalReviews: 89,
  },
  {
    name: "Smart Watch Series X",
    description:
      "Advanced fitness and health tracking, heart rate monitor, GPS, and custom watch faces. Your ultimate digital companion.",
    price: 349.99,
    stock: 60,
    category: "Wearables",
    images: [
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500",
      "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500",
    ],
    averageRating: 4.7,
    totalReviews: 256,
  },
  {
    name: "1TB NVMe M.2 SSD",
    description:
      "Lightning-fast internal solid state drive. Drastically cut load times and boost system responsiveness.",
    price: 89.99,
    stock: 150,
    category: "Storage",
    images: [
      "https://images.unsplash.com/photo-1628557044797-f8f2d4ce1a82?w=500",
      "https://images.unsplash.com/photo-1590483736622-398541ce1fdd?w=500"
    ],
    averageRating: 4.9,
    totalReviews: 610,
  },
  {
    name: "Wireless Charging Pad",
    description:
      "Sleek and minimalist 15W fast-charging pad. Compatible with all Qi-enabled smartphones and earbuds.",
    price: 39.99,
    stock: 200,
    category: "Accessories",
    images: [
      "https://images.unsplash.com/photo-1622445270947-32dc2ee7c24f?w=500",
      "https://images.unsplash.com/photo-1615526658079-5e263c965e31?w=500"
    ],
    averageRating: 4.3,
    totalReviews: 120,
  },
  {
    name: "Smart Home Hub Controller",
    description:
      "Voice-activated smart display to control lights, locks, cameras, and thermostats. Keep your whole house connected.",
    price: 149.99,
    stock: 40,
    category: "Smart Home",
    images: [
      "https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=500",
      "https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500"
    ],
    averageRating: 4.6,
    totalReviews: 295,
  }
];

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(ENV.DB_URL);
    console.log("✅ Connected to MongoDB");

    // Clear existing products
    await Product.deleteMany({});
    console.log("🗑️  Cleared existing products");

    // Insert seed products
    await Product.insertMany(products);
    console.log(`✅ Successfully seeded ${products.length} products`);

    // Display summary
    const categories = [...new Set(products.map((p) => p.category))];
    console.log("\n📊 Seeded Products Summary:");
    console.log(`Total Products: ${products.length}`);
    console.log(`Categories: ${categories.join(", ")}`);

    // Close connection
    await mongoose.connection.close();
    console.log("\n✅ Database seeding completed and connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
};

// Run the seed function
seedDatabase();