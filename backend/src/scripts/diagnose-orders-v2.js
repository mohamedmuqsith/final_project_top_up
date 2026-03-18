import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

async function diagnose() {
  try {
    const mongoUri = process.env.DB_URL;
    if (!mongoUri) throw new Error("DB_URL not found");

    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const orders = await db.collection("orders").find({}).toArray();

    console.log(`Total Orders: ${orders.length}`);

    const stats = {
      online_pending: 0,
      online_paid: 0,
      cod_pending: 0,
      cod_paid: 0,
      cancelled: 0,
      refunded: 0,
      inconsistent_online: []
    };

    orders.forEach(o => {
      if (o.paymentMethod === "online") {
        if (o.paymentStatus === "pending") {
          stats.online_pending++;
          if (o.status !== "pending") stats.inconsistent_online.push(o._id);
        } else if (o.paymentStatus === "paid") {
          stats.online_paid++;
        }
      } else if (o.paymentMethod === "cod") {
        if (o.paymentStatus === "pending") stats.cod_pending++;
        else if (o.paymentStatus === "paid") stats.cod_paid++;
      }

      if (o.status === "cancelled") stats.cancelled++;
      if (o.status === "refunded") stats.refunded++;
    });

    console.log("Diagnostics Results:", JSON.stringify(stats, null, 2));
    process.exit(0);
  } catch (error) {
    console.error("Diagnosis failed:", error);
    process.exit(1);
  }
}

diagnose();
