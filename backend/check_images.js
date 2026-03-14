import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './src/models/product.model.js';

dotenv.config();

const DB_URL = process.env.DB_URL;

async function checkProductImages() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");
        const products = await Product.find({}, 'name images');
        products.forEach(p => {
            console.log(`Product: ${p.name}`);
            console.log(`Images: ${JSON.stringify(p.images)}`);
        });
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkProductImages();
