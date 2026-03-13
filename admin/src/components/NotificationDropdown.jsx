import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BellIcon, CheckIcon } from "lucide-react";
import { notificationApi } from "../lib/api";
import { Link, useNavigate } from "react-router";
import { formatDistanceToNow } from "date-fns";

const ADMIN_ALLOWED_TYPES = [
  "NEW_ORDER",
  "ORDER_MARKED_SHIPPED",
  "ORDER_MARKED_DELIVERED",
  "LOW_STOCK",
  "PREDICTED_STOCKOUT",
  "PAYMENT_FAILED",
  "OUT_OF_STOCK"
];

function NotificationDropdown() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: countData } = useQuery({
    queryKey: ["notifications", "unreadCount"],
    queryFn: notificationApi.getUnreadCount,
    refetchInterval: 30000, 
  });

  const { data: notifData } = useQuery({
    queryKey: ["notifications", { page: 1, limit: 10 }],
    queryFn: () => notificationApi.getNotifications({ page: 1, limit: 10 }),
    refetchInterval: 30000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const notifications = (notifData?.notifications || []).filter(n => ADMIN_ALLOWED_TYPES.includes(n.type));
  const unreadCount = countData?.unreadCount || 0;

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else if (
      notification.type === "NEAR_STOCKOUT" || 
      notification.type === "LOW_STOCK" ||
      notification.type === "OUT_OF_STOCK" ||
      notification.type === "PREDICTED_STOCKOUT"
    ) {
      navigate("/inventory-alerts");
    } else if (
      notification.type === "NEW_ORDER" || 
      notification.type === "PAYMENT_FAILED" ||
      notification.type === "ORDER_MARKED_SHIPPED" ||
      notification.type === "ORDER_MARKED_DELIVERED"
    ) {
      navigate("/orders");
    }
  };

  const getBadgeColor = (type) => {
    if (type === "LOW_STOCK" || type === "OUT_OF_STOCK" || type === "PAYMENT_FAILED") return "badge-error";
    if (type === "PREDICTED_STOCKOUT") return "badge-warning";
    if (type === "NEW_ORDER" || type === "ORDER_MARKED_DELIVERED") return "badge-success";
    if (type === "ORDER_MARKED_SHIPPED") return "badge-info";
    return "badge-ghost";
  };

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle relative">
        <div className="indicator">
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <span className="badge badge-sm indicator-item badge-error text-[10px] w-4 h-4 p-0">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>
      <div
        tabIndex={0}
        className="dropdown-content mt-3 z-1 card card-compact w-80 md:w-96 p-2 shadow-lg bg-base-100 border border-base-200"
      >
        <div className="card-body p-0">
          <div className="flex justify-between items-center p-4 border-b border-base-200">
            <h3 className="font-bold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-xs text-primary"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                Mark all as read <CheckIcon className="w-3 h-3 ml-1" />
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-sm text-base-content/60">
                <BellIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>You're all caught up!</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 border-b border-base-200/50 cursor-pointer hover:bg-base-200 transition-colors flex gap-3 ${
                      !notif.isRead ? "bg-base-200/30" : "opacity-70"
                    }`}
                  >
                    {!notif.isRead && (
                      <div className="w-2 h-2 shrink-0 rounded-full bg-primary mt-2"></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-1 items-start">
                        <p className={`text-sm truncate font-medium ${!notif.isRead ? "text-base-content" : ""}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] whitespace-nowrap text-base-content/50">
                          {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs mt-1 text-base-content/80 line-clamp-2">
                        {notif.message}
                      </p>
                      <div className={`mt-2 badge badge-xs font-bold tracking-wider ${getBadgeColor(notif.type)}`}>
                        {notif.type.replace(/_/g, " ")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="p-2 text-center border-t border-base-200 bg-base-200/50 rounded-b-xl">
             <span className="text-xs text-base-content/50 font-medium">Viewing last 10 activities</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationDropdown;
