import mongoose from "mongoose";
import dotenv from "dotenv";
import { Product } from "../src/models/product.model.js";

dotenv.config();

const backfillSkus = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected successfully.\n");

    const products = await Product.find({ 
      $or: [
        { sku: { $exists: false } },
        { sku: null },
        { sku: "" }
      ] 
    });

    if (products.length === 0) {
      console.log("No products found without SKU. Backfill not required.");
      process.exit(0);
    }

    console.log(`Found ${products.length} products to backfill.\n`);

    let updatedCount = 0;
    for (const product of products) {
      // Format: CAT-NAME-RAND
      const catPrefix = (product.category || "GEN").substring(0, 3).toUpperCase();
      const namePrefix = product.name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      
      const newSku = `${catPrefix}-${namePrefix}-${randomSuffix}`;
      
      product.sku = newSku;
      await product.save();
      
      updatedCount++;
      console.log(`[${updatedCount}/${products.length}] Generated SKU for "${product.name}": ${newSku}`);
    }

    console.log(`\nSuccessfully backfilled ${updatedCount} products.`);
    process.exit(0);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
};

backfillSkus();
