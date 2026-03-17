import ProductsGrid from "@/components/ProductsGrid";
import SafeScreen from "@/components/SafeScreen";
import useProducts from "@/hooks/useProducts";
import { useRecommendedProducts, useTrendingProducts } from "@/hooks/useRecommendations";
import { useOffers } from "@/hooks/useOffers";
import HorizontalProductList from "@/components/HorizontalProductList";


import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const CATEGORIES: { name: string; icon?: any; image?: any }[] = [
  { name: "All", icon: "grid-outline" as const },
  { name: "Smartphones", icon: "phone-portrait-outline" as const },
  { name: "Laptops", icon: "laptop-outline" as const },
  { name: "Tablets", icon: "tablet-portrait-outline" as const },
  { name: "Audio", icon: "musical-notes-outline" as const },
  { name: "Headphones", icon: "headset-outline" as const },
  { name: "Speakers", icon: "volume-high-outline" as const },
  { name: "Gaming", icon: "game-controller-outline" as const },
  { name: "Accessories", icon: "hardware-chip-outline" as const },
  { name: "Smart Home", icon: "home-outline" as const },
  { name: "Wearables", icon: "watch-outline" as const },
  { name: "Cameras", icon: "camera-outline" as const },
  { name: "Storage", icon: "server-outline" as const },
  { name: "Networking", icon: "wifi-outline" as const },
  { name: "Monitors", icon: "desktop-outline" as const },
  { name: "Computer Components", icon: "hardware-chip-outline" as const }
];

const ShopScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: products, isLoading, isError } = useProducts();
  const { data: recommendations, isLoading: recLoading, isError: recError } = useRecommendedProducts();
  const { data: trending, isLoading: trendLoading, isError: trendError } = useTrendingProducts();
  const { offers } = useOffers();

  const filteredProducts = useMemo(() => {
    if (!products) return [];

    let filtered = products;

    // filtering by category
    if (selectedCategory !== "All") {
      filtered = filtered.filter((product) => product.category === selectedCategory);
    }

    // filtering by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [products, selectedCategory, searchQuery]);

  return (
    <SafeScreen>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View className="px-6 pb-4 pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <View>
              <Text className="text-text-primary text-3xl font-bold tracking-tight">Shop</Text>
              <Text className="text-text-secondary text-sm mt-1">Browse all products</Text>
            </View>
          </View>
            
          {/* SEARCH BAR */}
          <View className="bg-surface flex-row items-center px-5 py-4 rounded-2xl">
            <Ionicons color={"#666"} size={22} name="search" />
            <TextInput
              placeholder="Search for products"
              placeholderTextColor={"#666"}
              className="flex-1 ml-3 text-base text-text-primary"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* OFFERS BANNER */}
        {offers.length > 0 && (
          <View className="mb-6">
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {offers.map((offer) => (
                <View 
                  key={offer._id}
                  style={{ width: width - 40 }}
                  className="bg-primary p-6 rounded-[32px] flex-row items-center justify-between mr-4"
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-background/60 text-xs font-bold uppercase tracking-widest mb-1">{offer.bannerText || "Exclusive Deal"}</Text>
                    <Text className="text-background text-2xl font-bold leading-tight mb-2">{offer.title}</Text>
                    <TouchableOpacity className="bg-background self-start px-4 py-2 rounded-full">
                      <Text className="text-primary font-bold text-xs">Shop Now</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="bg-background/20 p-4 rounded-full">
                     <Ionicons name="pricetag" size={40} color="#121212" />
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* CATEGORY FILTER */}
        <View className="mb-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {CATEGORIES.map((category) => {
              const isSelected = selectedCategory === category.name;
              return (
                <TouchableOpacity
                  key={category.name}
                  onPress={() => setSelectedCategory(category.name)}
                  className={`mr-3 rounded-2xl w-20 overflow-hidden items-center justify-center py-3 ${isSelected ? "bg-primary" : "bg-surface"}`}
                >
                  {category.icon ? (
                    <Ionicons
                      name={category.icon as any}
                      size={28}
                      color={isSelected ? "#121212" : "#fff"}
                    />
                  ) : (
                    <Image source={category.image} className="size-7" resizeMode="contain" />
                  )}
                  <Text
                    className={`text-[10px] font-semibold mt-1.5 text-center px-1 ${isSelected ? "text-background" : "text-text-secondary"}`}
                    numberOfLines={1}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <HorizontalProductList 
          title="Recommended for You"
          products={recommendations?.recommendations}
          isLoading={recLoading}
          isError={recError}
          aiEnhanced={recommendations?.aiEnhanced}
        />

        {/* TRENDING PRODUCTS */}
        <HorizontalProductList 
          title="Trending Electronics"
          products={trending?.recommendations}
          isLoading={trendLoading}
          isError={trendError}
          aiEnhanced={trending?.aiEnhanced}
        />

        <View className="px-6 mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-text-primary text-lg font-bold">Products</Text>
            <Text className="text-text-secondary text-sm">{filteredProducts.length} items</Text>
          </View>

          {/* PRODUCTS GRID */}
          <ProductsGrid products={filteredProducts} isLoading={isLoading} isError={isError} />
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

export default ShopScreen;