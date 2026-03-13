import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useEffect, useState } from "react";
import { useApi } from "@/lib/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

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

  const fetchNotifications = async (pageNumber = 1, isRefresh = false) => {
    try {
      const { data } = await api.get(`/notifications?recipientType=customer&page=${pageNumber}&limit=15`);
      
      const notificationsArray = data.notifications || [];
      
      if (isRefresh) {
        setNotifications(notificationsArray.filter((n: any) => CUSTOMER_ALLOWED_TYPES.includes(n.type)));
      } else {
        const filtered = notificationsArray.filter((n: any) => CUSTOMER_ALLOWED_TYPES.includes(n.type));
        setNotifications((prev) => [...prev, ...filtered]);
      }
      
      setHasMore(data.currentPage < data.totalPages);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, true);
  }, []);

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

  const handlePress = async (notification: NotificationItem) => {
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

    if (notification.actionUrl) {
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
        className={`p-4 border-b border-gray-100 flex-row gap-3 ${isUnread ? "bg-teal-50/50" : "bg-white"}`}
      >
        <View className="mt-1">
          {item.type.includes("SUCCESS") || item.type.includes("PLACED") ? (
            <Ionicons name="checkmark-circle" size={24} color="#4FD1C5" />
          ) : item.type.includes("SHIPPED") ? (
            <Ionicons name="airplane" size={24} color="#4FD1C5" />
          ) : item.type.includes("DELIVERED") ? (
            <Ionicons name="gift" size={24} color="#4FD1C5" />
          ) : item.type.includes("CANCELLED") ? (
            <Ionicons name="close-circle" size={24} color="#EF4444" />
          ) : (
            <Ionicons name="notifications" size={24} color={isUnread ? "#4FD1C5" : "#9CA3AF"} />
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <Text className={`font-semibold text-base ${isUnread ? "text-gray-900" : "text-gray-700"}`}>
              {item.title}
            </Text>
            {isUnread && <View className="w-2 h-2 rounded-full bg-teal-400 mt-2" />}
          </View>
          <Text className={`mt-1 text-sm ${isUnread ? "text-gray-700" : "text-gray-500"}`}>
            {item.message}
          </Text>
          <Text className="mt-2 text-xs text-gray-400">
            {getRelativeTime(item.createdAt)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && page === 1) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#4FD1C5" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-6 pt-16 pb-4 bg-white border-b border-gray-100 flex-row justify-between items-end">
        <Text className="text-3xl font-bold text-gray-900">Notifications</Text>
        <TouchableOpacity onPress={markAllAsRead}>
          <Text className="text-teal-500 font-semibold mb-1">Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4FD1C5" />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center mt-32 px-10">
            <Ionicons name="notifications-off-outline" size={64} color="#D1D5DB" />
            <Text className="text-gray-500 text-lg mt-4 text-center">
              You're all caught up! No active notifications.
            </Text>
          </View>
        }
        ListFooterComponent={
          loading && page > 1 ? (
            <View className="py-4">
              <ActivityIndicator size="small" color="#4FD1C5" />
            </View>
          ) : null
        }
      />
    </View>
  );
}
