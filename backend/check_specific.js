import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './src/models/product.model.js';

dotenv.config();

const DB_URL = process.env.DB_URL;

async function checkProduct() {
    try {
        await mongoose.connect(DB_URL);
        const p = await Product.findOne({ name: /1TB NVMe/i });
        console.log(JSON.stringify(p, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkProduct();
