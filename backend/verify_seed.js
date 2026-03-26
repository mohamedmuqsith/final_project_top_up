import mongoose from "mongoose";
import { Product } from "./src/models/product.model.js";
import { ENV } from "./src/config/env.js";

const verifySeed = async () => {
    try {
        await mongoose.connect(ENV.DB_URL);
        const products = await Product.find({});
        console.log(`Total Products: ${products.length}`);

        const categoryCounts = {};
        products.forEach(p => {
            categoryCounts[p.category] = (categoryCounts[p.category] || 0) + 1;
        });

        console.log("\nCounts per category:");
        Object.entries(categoryCounts).forEach(([cat, count]) => {
            console.log(`${cat}: ${count}`);
        });

        // Check first product image structure and new fields
        if (products.length > 0) {
            console.log("\nSample Product (New Fields):");
            console.log(`Name: ${products[0].name}`);
            console.log(`Brand: ${products[0].brand || "❌ MISSING"}`);
            console.log(`SKU: ${products[0].sku || "❌ MISSING"}`);
            console.log("\nImage Structure:");
            console.log(JSON.stringify(products[0].images, null, 2));
        }

        const missingFields = products.filter(p => !p.brand || !p.sku);
        if (missingFields.length > 0) {
            console.log(`\n⚠️ WARNING: ${missingFields.length} products are missing brand or SKU!`);
        } else {
            console.log("\n✅ ALL products have valid Brand and SKU.");
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

verifySeed();
