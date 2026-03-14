import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './src/models/product.model.js';

dotenv.config();

const DB_URL = process.env.DB_URL;

async function checkProducts() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");
        const count = await Product.countDocuments();
        console.log("Product count:", count);
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkProducts();
