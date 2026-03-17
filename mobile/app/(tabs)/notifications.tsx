import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useApi } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import SafeScreen from "@/components/SafeScreen";

const CUSTOMER_ALLOWED_TYPES = [
  "ORDER_PLACED",
  "PAYMENT_SUCCESS",
  "ORDER_SHIPPED",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
  "PAYMENT_FAILED"
];

// Simple relative time formatter
const getRelativeTime = (dateParam: Date | string | number) => {
  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);
  const today = new Date();
  const seconds = Math.round((today.getTime() - date.getTime()) / 1000);
  const minutes = Math.round(seconds / 60);
  const hours = Math.round(minutes / 60);
  const days = Math.round(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

interface NotificationItem {
  _id: string;
  isRead: boolean;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  actionUrl?: string;
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const api = useApi();
  const router = useRouter();

  const fetchNotifications = useCallback(async (pageNumber = 1, isRefresh = false) => {
    try {
      const url = `notifications?recipientType=customer&page=${pageNumber}&limit=15`;
      const { data } = await api.get(url);
      
      const notificationsArray = data.notifications || [];
      
      if (isRefresh) {
        setNotifications(notificationsArray.filter((n: any) => CUSTOMER_ALLOWED_TYPES.includes(n.type)));
      } else {
        const filtered = notificationsArray.filter((n: any) => CUSTOMER_ALLOWED_TYPES.includes(n.type));
        setNotifications((prev) => [...prev, ...filtered]);
      }
      
      setHasMore(data.currentPage < data.totalPages);
    } catch (error: any) {
      console.error("Error fetching notifications:", error?.response?.status || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    fetchNotifications(1, true);
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchNotifications(1, true);
  };

  const loadMore = () => {
    if (!loading && hasMore && !refreshing) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchNotifications(nextPage);
    }
  };

  const handlePress = async (notification: NotificationItem & { entityId?: string, entityModel?: string }) => {
    if (!notification.isRead) {
      try {
        await api.patch(`/notifications/${notification._id}/read`);
        setNotifications((prev: NotificationItem[]) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
      } catch (error) {
        console.error("Error marking as read", error);
      }
    }

    if (notification.entityModel === "Order" && notification.entityId) {
      router.push(`/(profile)/order/${notification.entityId}` as any);
    } else if (notification.actionUrl) {
      router.push(notification.actionUrl as any);
    } else {
      router.push("/(tabs)/profile" as any); // Fallback routing for customers
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all?recipientType=customer');
      setNotifications((prev: NotificationItem[]) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (error) {
      console.error("Error marking all as read", error);
    }
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.isRead;

    return (
      <TouchableOpacity 
        onPress={() => handlePress(item)}
        className={`bg-surface rounded-2xl mb-3 mx-4 p-4 flex-row gap-3 overflow-hidden ${isUnread ? "border border-primary/30" : ""}`}
        activeOpacity={0.8}
      >
        <View className="mt-1">
          {item.type.includes("SUCCESS") || item.type.includes("PLACED") || item.type === "ORDER_PROCESSING" ? (
            <Ionicons name="checkmark-circle" size={24} color="#00D9FF" />
          ) : item.type.includes("SHIPPED") ? (
            <Ionicons name="airplane" size={24} color="#00D9FF" />
          ) : item.type.includes("DELIVERED") ? (
            <Ionicons name="gift" size={24} color="#00D9FF" />
          ) : item.type.includes("CANCELLED") || item.type === "RETURN_DENIED" ? (
            <Ionicons name="close-circle" size={24} color="#FF6B6B" />
          ) : item.type.includes("RETURN") || item.type.includes("REFUND") ? (
            <Ionicons name="refresh-circle" size={24} color="#00D9FF" />
          ) : (
            <Ionicons name="notifications" size={24} color={isUnread ? "#00D9FF" : "#666666"} />
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text className={`text-text-primary text-base font-bold pr-2`}>
              {item.title}
            </Text>
            {isUnread && <View className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />}
          </View>
          <Text className={`mt-1 text-text-secondary text-sm`}>
            {item.message}
          </Text>
          <Text className="mt-2 text-text-secondary/70 text-xs font-medium">
            {getRelativeTime(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && page === 1) {
    return (
      <SafeScreen>
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#00D9FF" />
          <Text className="text-text-secondary mt-4">Loading notifications...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen>
      <View className="px-6 pb-4 pt-6 flex-row justify-between items-end mb-2">
        <Text className="text-text-primary text-3xl font-bold tracking-tight">Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={markAllAsRead} activeOpacity={0.7} className="mb-1">
            <Text className="text-primary font-semibold">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00D9FF" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-32 px-10">
            <Ionicons name="notifications-off-outline" size={64} color="#666666" />
            <Text className="text-text-primary font-bold text-lg mt-4 text-center">
              You&apos;re all caught up! 
            </Text>
            <Text className="text-text-secondary text-sm mt-1 text-center">
              No active notifications at the moment.
            </Text>
          </View>
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <View className="py-4 mt-2">
              <ActivityIndicator size="small" color="#00D9FF" />
            </View>
          ) : null
        }
      />
    </SafeScreen>
  );
}
