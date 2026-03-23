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

        // Check first product image structure
        if (products.length > 0) {
            console.log("\nSample Image Structure:");
            console.log(JSON.stringify(products[0].images, null, 2));
        }

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

verifySeed();
