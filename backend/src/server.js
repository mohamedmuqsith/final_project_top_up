import express from "express";
import path from "path";
import { ENV } from "./config/env.js";

const app = express();

const __dirname = path.resolve();

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

app.listen(ENV.PORT, () => console.log("server is up and running"));

