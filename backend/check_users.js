import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './src/models/user.model.js';

dotenv.config();

const DB_URL = process.env.DB_URL;

async function checkUsers() {
    try {
        await mongoose.connect(DB_URL);
        console.log("Connected to DB");
        const users = await User.find({}, 'name email clerkId role');
        console.log("Users in DB:", JSON.stringify(users, null, 2));
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

checkUsers();
