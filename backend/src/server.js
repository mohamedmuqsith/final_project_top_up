import express from "express";
import path from "path";
import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { functions, inngest } from "./config/inngest.js";

import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";
import adminRoutes from "./routes/admin.route.js"
import userRoutes from "./routes/user.route.js"
import orderRoutes from "./routes/order.route.js";

const app = express();

const __dirname = path.resolve();
app.use(express.json())
app.use(clerkMiddleware()) // add auth object under the request =>req.auth

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/admin",adminRoutes)
app.use("/api/users",userRoutes)
app.use("/api/orders", orderRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ message: "Success" });
});

// make my app ready for deployment
if (ENV.NODE_ENV === "production") {
  // if we are in production mode, serve the static files from the admin/dist folder
  app.use(express.static(path.join(__dirname, "../admin/dist"))); // serve static files from the admin/dist folder

  app.get("/{*any}", (req, res) => {
    // any route that is not an API route, we will serve the index.html file
    res.sendFile(path.join(__dirname, "../admin", "dist", "index.html")); // serve the index.html file
  });
}

const startServer = async () => {
  await connectDB();
  app.listen(ENV.PORT, () => {
    console.log("server is up and running");
  });
};
startServer();


