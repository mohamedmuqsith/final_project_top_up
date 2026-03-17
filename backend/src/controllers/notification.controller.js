import { Notification } from "../models/notification.model.js";

// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const isRead = req.query.isRead;
    const type = req.query.type;

    const query = {};
    const requestedRecipientType = req.query.recipientType;

    if (requestedRecipientType === "admin") {
      // Security: Only real admins can fetch "admin" notifications
      if (!isAdmin) {
        return res.status(403).json({ error: "Forbidden: Admin access required" });
      }
      query.recipientType = "admin";
    } else if (requestedRecipientType === "customer") {
      // Customers (and admins) can fetch customer-targeted notifications
      query.recipientType = "customer";
      query.recipientId = req.user._id;
    } else {
      // Legacy/Fallback: If no recipientType specified, use role-based default
      if (isAdmin) {
        // Admins default to seeing BOTH in unified feed (but clients should preferred-type)
        query.$or = [
          { recipientType: "admin" },
          { recipientType: "customer", recipientId: req.user._id }
        ];
      } else {
        query.recipientType = "customer";
        query.recipientId = req.user._id;
      }
    }

    if (isRead !== undefined) {
      query.isRead = isRead === "true";
    }

    if (type) {
      query.type = type;
    }

    const total = await Notification.countDocuments(query);
    const totalUnread = await Notification.countDocuments({ ...query, isRead: false });

    const notifications = await Notification.find(query)
      .populate("entityId") // Optionally populate for richer UI
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.status(200).json({
      notifications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      totalCount: total,
      totalUnread,
    });
  } catch (error) {
    console.error("Error in getNotifications:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === "admin";

    const query = { _id: id };
    // We already have the notification ID, but we must ensure the user has permission to read it
    if (!isAdmin) {
      query.recipientId = req.user._id;
      query.recipientType = "customer";
    } else {
      // Admin can mark anything as read as long as it belongs to them or the system
      query.$or = [
        { recipientType: "admin" },
        { recipientType: "customer", recipientId: req.user._id }
      ];
    }

    const notification = await Notification.findOneAndUpdate(
      query,
      { $set: { isRead: true } },
      { new: true, returnDocument: 'after' } // Added returnDocument for Mongoose 6+ compatibility
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.error("Error in markAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// PATCH /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    
    const query = { isRead: false };
    const requestedRecipientType = req.query.recipientType;

    if (requestedRecipientType === "admin") {
      if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
      query.recipientType = "admin";
    } else if (requestedRecipientType === "customer") {
      query.recipientType = "customer";
      query.recipientId = req.user._id;
    } else {
      // Default behavior
      if (!isAdmin) {
        query.recipientId = req.user._id;
        query.recipientType = "customer";
      } else {
        query.$or = [
          { recipientType: "admin" },
          { recipientType: "customer", recipientId: req.user._id }
        ];
      }
    }

    await Notification.updateMany(query, { isRead: true });
    console.log(`[Notification] markAllAsRead successful for user ${req.user?._id}`);

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Error in markAllAsRead:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const isAdmin = req.user.role === "admin";
    
    const query = { isRead: false };
    const requestedRecipientType = req.query.recipientType;

    if (requestedRecipientType === "admin") {
      if (!isAdmin) return res.status(403).json({ error: "Forbidden" });
      query.recipientType = "admin";
    } else if (requestedRecipientType === "customer") {
      query.recipientType = "customer";
      query.recipientId = req.user._id;
    } else {
      if (!isAdmin) {
        query.recipientId = req.user._id;
        query.recipientType = "customer";
      } else {
        query.$or = [
          { recipientType: "admin" },
          { recipientType: "customer", recipientId: req.user._id }
        ];
      }
    }

    const unreadCount = await Notification.countDocuments(query);

    res.status(200).json({ unreadCount });
  } catch (error) {
    console.error("Error in getUnreadCount:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
