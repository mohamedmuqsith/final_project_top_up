import { Redirect, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@clerk/expo";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";
import { useApi } from "@/lib/api";
import { useEffect, useState } from "react";

const TabsLayout = () => {
  const { isSignedIn, isLoaded } = useAuth();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoaded && isSignedIn && api) {
      const fetchCount = async () => {
        try {
          const { data } = await api.get("notifications/unread-count");
          setUnreadCount(data.unreadCount);
        } catch (e) {
          // ignore error to not spam console
        }
      };
      
      fetchCount();
      interval = setInterval(fetchCount, 30000); // poll every 30s
    }
    return () => clearInterval(interval);
  }, [isLoaded, isSignedIn, api]);

  if (!isLoaded) return null; // for a better ux
  if (!isSignedIn) return <Redirect href={"/(auth)"} />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#4FD1C5",
        tabBarInactiveTintColor: "#FFFFFF",
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: 32 + insets.bottom,
          paddingTop: 6.50,
          marginHorizontal: 100,
          marginBottom: insets.bottom,
          borderRadius: 40,
          overflow: "hidden",
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="dark"
            style={StyleSheet.absoluteFill}
            // StyleSheet.absoluteFill is equal to this 👇
            // { position: "absolute", top: 0, right: 0, left: 0, bottom: 0 }
          />
        ),
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 600,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Shop",
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => <Ionicons name="cart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: { backgroundColor: "#ef4444" }
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;