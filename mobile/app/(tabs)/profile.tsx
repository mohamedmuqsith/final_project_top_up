import SafeScreen from "@/components/SafeScreen";
import { useAuth, useUser } from "@clerk/expo";

import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCurrency } from "@/components/CurrencyProvider";

const MENU_ITEMS = [
  { id: 1, icon: "person-outline", title: "Edit Profile", color: "#3B82F6", action: "/profile" },
  { id: 2, icon: "list-outline", title: "Orders", color: "#10B981", action: "/orders" },
  { id: 3, icon: "location-outline", title: "Addresses", color: "#F59E0B", action: "/addresses" },
  { id: 4, icon: "heart-outline", title: "Wishlist", color: "#EF4444", action: "/wishlist" },
] as const;

const ProfileScreen = () => {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { currency, setCurrency } = useCurrency();

  const handleMenuPress = (action: (typeof MENU_ITEMS)[number]["action"]) => {
    if (action === "/profile") return;
    router.push(action);
  };

  return (
    <SafeScreen>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* HEADER */}
        <View className="px-6 pb-4 pt-6 flex-row justify-between items-end mb-2">
          <Text className="text-text-primary text-3xl font-bold tracking-tight">Profile</Text>
        </View>

        {/* USER INFO */}
        <View className="px-6 pb-8">
          <View className="bg-surface rounded-3xl p-6">
            <View className="flex-row items-center">
              <View className="relative">
                <Image
                  source={user?.imageUrl}
                  style={{ width: 80, height: 80, borderRadius: 40 }}
                  transition={200}
                />
                <View className="absolute -bottom-1 -right-1 bg-primary rounded-full size-7 items-center justify-center border-2 border-surface">
                  <Ionicons name="checkmark" size={16} color="#121212" />
                </View>
              </View>

              <View className="flex-1 ml-4">
                <Text className="text-text-primary text-2xl font-bold mb-1">
                  {user?.firstName} {user?.lastName}
                </Text>
                <Text className="text-text-secondary text-sm">
                  {user?.emailAddresses?.[0]?.emailAddress || "No email"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* MENU ITEMS */}
        <View className="flex-row flex-wrap gap-2 mx-6 mb-3">
          {MENU_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              className="bg-surface rounded-2xl p-6 items-center justify-center"
              style={{ width: "48%" }}
              activeOpacity={0.7}
              onPress={() => handleMenuPress(item.action)}
            >
              <View
                className="rounded-full w-16 h-16 items-center justify-center mb-4"
                style={{ backgroundColor: item.color + "20" }}
              >
                <Ionicons name={item.icon} size={28} color={item.color} />
              </View>
              <Text className="text-text-primary font-bold text-base">{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* NOTIFICATONS BTN */}
        <View className="mb-3 mx-6 bg-surface rounded-2xl p-4">
          <TouchableOpacity
            className="flex-row items-center justify-between py-2"
            activeOpacity={0.7}
            onPress={() => router.push("/notifications" as any)}
          >
            <View className="flex-row items-center">
              <View className="bg-primary/20 p-2 rounded-xl border border-primary/10">
                <Ionicons name="notifications" size={20} color="#00D9FF" />
              </View>
              <Text className="text-text-primary font-semibold ml-4">Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* PRIVACY AND SECURTIY LINK */}
        <View className="mb-3 mx-6 bg-surface rounded-2xl p-4">
          <TouchableOpacity
            className="flex-row items-center justify-between py-2"
            activeOpacity={0.7}
            onPress={() => router.push("/privacy-security")}
          >
            <View className="flex-row items-center">
              <View className="bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/10">
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
              </View>
              <Text className="text-text-primary font-semibold ml-4">Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>
        
        {/* CURRENCY SELECTOR */}
        <View className="mb-3 mx-6 bg-surface rounded-2xl p-4">
           <View className="flex-row items-center justify-between py-2">
             <View className="flex-row items-center">
               <View className="bg-amber-500/20 p-2 rounded-xl border border-amber-500/10">
                 <Ionicons name="cash-outline" size={20} color="#F59E0B" />
               </View>
               <Text className="text-text-primary font-semibold ml-4">Currency</Text>
             </View>
             
             <View className="flex-row items-center bg-background rounded-xl p-1">
                <TouchableOpacity 
                   onPress={() => setCurrency("USD")}
                   className={`px-4 py-1.5 rounded-lg ${currency === "USD" ? "bg-primary" : "bg-transparent"}`}
                >
                   <Text className={`text-xs font-bold ${currency === "USD" ? "text-background" : "text-text-secondary"}`}>USD</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                   onPress={() => setCurrency("LKR")}
                   className={`px-4 py-1.5 rounded-lg ${currency === "LKR" ? "bg-primary" : "bg-transparent"}`}
                >
                   <Text className={`text-xs font-bold ${currency === "LKR" ? "text-background" : "text-text-secondary"}`}>LKR</Text>
                </TouchableOpacity>
             </View>
           </View>
        </View>

        {/* SIGNOUT BTN */}
        <TouchableOpacity
          className="mx-6 mb-3 bg-surface/50 rounded-2xl py-5 flex-row items-center justify-center border border-red-500/30"
          activeOpacity={0.8}
          onPress={() => signOut()}
        >
          <Ionicons name="log-out" size={22} color="#FF6B6B" />
          <Text className="text-[#FF6B6B] font-bold text-base ml-2">Sign Out</Text>
        </TouchableOpacity>

        <Text className="mx-6 mb-3 text-center text-text-secondary text-xs">Version 1.0.0</Text>
      </ScrollView>
    </SafeScreen>
  );
};

export default ProfileScreen;

// REACT NATIVE IMAGE VS EXPO IMAGE:

// React Native Image (what we have used so far):
// import { Image } from "react-native";
//
// <Image source={{ uri: url }} />

// Basic image component
// No built-in caching optimization
// Requires source={{ uri: string }}

// Expo Image (from expo-image):
// import { Image } from "expo-image";

// <Image source={url} />

// Caching - automatic disk/memory caching
// Placeholder - blur hash, thumbnail while loading
// Transitions - crossfade, fade animations
// Better performance - optimized native rendering
// Simpler syntax: source={url} or source={{ uri: url }}
// Supports contentFit instead of resizeMode

// Example with expo-image:
// <Image   source={user?.imageUrl}  placeholder={blurhash}  transition={200}  contentFit="cover"  className="size-20 rounded-full"/>

// Recommendation: For production apps, expo-image is better — faster, cached, smoother UX.
// React Native's Image works fine for simple cases though.