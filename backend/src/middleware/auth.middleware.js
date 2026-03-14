import { requireAuth, clerkClient } from "@clerk/express";
import { User } from "../models/user.model.js";
import { ENV } from "../config/env.js";

export const protectRoute = [
  requireAuth(),
  async (req, res, next) => {
    try {
      const auth = typeof req.auth === "function" ? req.auth() : req.auth;
      const clerkId = auth?.userId;
      if (!clerkId) return res.status(401).json({ message: "Unauthorized - invalid token" });

      let user = await User.findOne({ clerkId });

      // JIT Provisioning: If user authenticated in Clerk but missing in DB, sync them now
      if (!user) {
        console.log(`[Auth] User ${clerkId} not found in DB. Attempting JIT provisioning...`);
        try {
          const clerkUser = await clerkClient.users.getUser(clerkId);
          const email = clerkUser.emailAddresses[0]?.emailAddress;
          const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || "User";
          
          user = await User.create({
            clerkId,
            email,
            name,
            imageUrl: clerkUser.imageUrl,
            addresses: [],
            wishlist: [],
          });
          console.log(`[Auth] JIT provisioning successful for ${email}`);
        } catch (clerkError) {
          console.error("[Auth] JIT provisioning failed:", clerkError.message);
          return res.status(404).json({ message: "User not found in local database and sync failed" });
        }
      }

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
