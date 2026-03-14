import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from './src/models/product.model.js';

dotenv.config();

async function check() {
    await mongoose.connect(process.env.DB_URL);
    const p = await Product.findOne({ name: /1TB NVMe/i });
    if (p && p.images) {
        p.images.forEach((img, i) => console.log(`IMAGE_${i}: ${img}`));
    } else {
        console.log("Product or images not found");
    }
    process.exit(0);
}
check();
