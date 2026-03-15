import mongoose from "mongoose";
import {ENV} from "./env.js";

export const connectDB = async () => {
    try{ 
            const conn = await mongoose.connect(ENV.DB_URL, {
                    family: 4, // Force IPv4 to avoid DNS resolution issues on some Windows setups
                    serverSelectionTimeoutMS: 5000, 
                    connectTimeoutMS: 10000,
            })
            console.log(`MongoDB Connected: ${conn.connection.host}`);
    }catch(error){
            console.error(`MongoDB connection Error:`, error.message);
            process.exit(1); //exit code 1 means failure and 0 means success
    }
}