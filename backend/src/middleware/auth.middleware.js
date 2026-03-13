import { requireAuth } from "@clerk/express";
import { User } from "../models/user.model.js";
import { ENV } from "../config/env.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const clerkId = req.auth().userId;
      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      const user = await User.findOne({ clerkId });
      if (!user) return res.status(404).json({ message: "User not found" });

      // Robust Role Sync: Sync from ENV.ADMIN_EMAIL to ensure 'role' is always correct
      const isAdminEmail = user.email.toLowerCase() === ENV.ADMIN_EMAIL?.toLowerCase();
      if (isAdminEmail && user.role !== "admin") {
        user.role = "admin";
        await user.save();
      } else if (!isAdminEmail && user.role === "admin") {
        user.role = "user";
        await user.save();
      }

      req.user = user;
      next();
    } catch (error) {
      console.error("Error in protectRoute middleware", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized - user not found" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden - admin access only" });
  }

  next();
};
