import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BellIcon, CheckIcon } from "lucide-react";
import { notificationApi } from "../lib/api";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

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

  // Display ALL notifications returned by the backend (already scoped to recipientType: "admin")
  // to ensure unread count and list are always in sync.
  const notifications = notifData?.notifications || [];
  const unreadCount = countData?.unreadCount || 0;

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification._id);
    }

    // Force blur to close daisyUI dropdown
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // Standardized navigation logic
    if (notification.entityModel === "Order" && notification.entityId) {
      navigate(`/orders?search=${notification.entityId}`);
    } else if (notification.entityModel === "Product" && notification.entityId) {
      navigate("/inventory-alerts");
    } else if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else {
      // Fallback by type
      const type = notification.type;
      if (
        type === "LOW_STOCK" ||
        type === "OUT_OF_STOCK" ||
        type === "PREDICTED_STOCKOUT"
      ) {
        navigate("/inventory-alerts");
      } else if (type === "NEW_REVIEW") {
        navigate("/reviews");
      } else {
        navigate("/orders");
      }
    }
  };

  const getBadgeColor = (type) => {
    if (
      type === "LOW_STOCK" ||
      type === "OUT_OF_STOCK" ||
      type === "PAYMENT_FAILED" ||
      type === "RETURN_REQUESTED" ||
      type === "ORDER_CANCELLED"
    )
      return "badge-error";
    if (
      type === "PREDICTED_STOCKOUT" ||
      type === "ORDER_REFUNDED" ||
      type === "RETURN_DENIED"
    )
      return "badge-warning";
    if (
      type === "NEW_ORDER" ||
      type === "ORDER_DELIVERED" ||
      type === "RETURN_APPROVED" ||
      type === "NEW_REVIEW"
    )
      return "badge-success";
    if (type === "ORDER_SHIPPED" || type === "ORDER_PROCESSING") return "badge-info";
    return "badge-ghost";
  };

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle relative rounded-2xl hover:bg-base-200"
      >
        <div className="indicator">
          <BellIcon className="size-5" />
          {unreadCount > 0 && (
            <span className="badge badge-sm indicator-item badge-error text-[10px] min-w-5 h-5 px-1 border-0 font-bold shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>
      </div>

      <div
        tabIndex={0}
        className="dropdown-content mt-3 z-60 w-88 sm:w-100 overflow-hidden rounded-[28px] border border-base-300/60 bg-base-100 shadow-2xl"
      >
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-20 bg-linear-to-r from-primary/10 via-secondary/10 to-accent/10 pointer-events-none"></div>

          {/* Header */}
          <div className="relative flex items-center justify-between gap-3 border-b border-base-200/70 px-5 py-4">
            <div>
              <h3 className="text-lg font-black tracking-tight">Notifications</h3>
              <p className="text-xs text-base-content/55 mt-1">
                Recent admin activity and alerts
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-xs rounded-xl text-primary hover:bg-primary/10"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
              >
                Mark all
                <CheckIcon className="w-3 h-3 ml-1" />
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-104 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-base-200 text-base-content/40">
                  <BellIcon className="w-7 h-7" />
                </div>
                <p className="text-sm font-semibold text-base-content/70">
                  You're all caught up
                </p>
                <p className="mt-1 text-xs text-base-content/45">
                  No recent admin notifications
                </p>
              </div>
            ) : (
              <div className="flex flex-col p-2">
                {notifications.map((notif) => (
                  <div
                    key={notif._id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`group relative cursor-pointer rounded-2xl border mb-2 px-4 py-4 transition-all duration-200 ${
                      !notif.isRead
                        ? "border-primary/15 bg-primary/5 hover:bg-primary/10"
                        : "border-transparent bg-base-100 hover:bg-base-200/60"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="pt-1">
                        {!notif.isRead ? (
                          <div className="size-2.5 rounded-full bg-primary shadow-sm"></div>
                        ) : (
                          <div className="size-2.5 rounded-full bg-base-300"></div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p
                            className={`truncate pr-2 text-sm font-bold ${
                              !notif.isRead
                                ? "text-base-content"
                                : "text-base-content/80"
                            }`}
                          >
                            {notif.title}
                          </p>

                          <span className="shrink-0 text-[10px] font-medium text-base-content/45">
                            {formatDistanceToNow(new Date(notif.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        </div>

                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-base-content/70">
                          {notif.message}
                        </p>

                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div
                            className={`badge badge-xs border-0 font-bold tracking-wider ${getBadgeColor(
                              notif.type
                            )}`}
                          >
                            {notif.type.replace(/_/g, " ")}
                          </div>

                          {!notif.isRead && (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-base-200/70 bg-base-100 px-4 py-3 text-center">
            <span className="text-xs font-medium text-base-content/45">
              Viewing last 10 activities
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotificationDropdown;