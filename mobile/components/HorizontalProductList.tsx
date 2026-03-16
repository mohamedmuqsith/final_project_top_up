import useCart from "@/hooks/useCart";
import useWishlist from "@/hooks/useWishlist";
import { Product } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";

interface HorizontalProductListProps {
  isLoading: boolean;
  isError: boolean;
  products?: Product[];
  title: string;
  aiEnhanced?: boolean;
}

const HorizontalProductList = ({ products, isLoading, isError, title, aiEnhanced }: HorizontalProductListProps) => {
  const { isInWishlist, toggleWishlist, isAddingToWishlist, isRemovingFromWishlist } = useWishlist();
  const { isAddingToCart, addToCart } = useCart();

  const handleAddToCart = (productId: string, productName: string) => {
    addToCart(
      { productId, quantity: 1 },
      {
        onSuccess: () => Alert.alert("Success", `${productName} added to cart!`),
        onError: (error: any) => Alert.alert("Error", error?.response?.data?.error || "Failed to add to cart"),
      }
    );
  };

  const renderProduct = ({ item: product }: { item: Product }) => (
    <TouchableOpacity
      className="bg-surface rounded-3xl overflow-hidden mr-4"
      style={{ width: 180 }}
      activeOpacity={0.8}
      onPress={() => router.push(`/product/${product._id}`)}
    >
      <View className="relative">
        <Image
          source={
            product.images?.[0] 
              ? { uri: product.images[0] } 
              : require("../assets/images/auth-image.png") 
          }
          className="w-full h-40 bg-background-lighter"
          resizeMode="cover"
        />
        {product.discountedPrice && product.discountedPrice < product.price && (
          <View className="absolute top-3 left-3 bg-primary px-2 py-1 rounded-lg">
            <Text className="text-background text-[10px] font-bold">
              {product.appliedOffer?.type === "percentage" 
                ? `-${product.appliedOffer.value}%` 
                : `Deals`}
            </Text>
          </View>
        )}
        <TouchableOpacity
          className="absolute top-3 right-3 bg-black/30 backdrop-blur-xl p-2 rounded-full"
          activeOpacity={0.7}
          onPress={() => toggleWishlist(product._id)}
          disabled={isAddingToWishlist || isRemovingFromWishlist}
        >
          {isAddingToWishlist || isRemovingFromWishlist ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={isInWishlist(product._id) ? "heart" : "heart-outline"}
              size={18}
              color={isInWishlist(product._id) ? "#FF6B6B" : "#FFFFFF"}
            />
          )}
        </TouchableOpacity>
      </View>

      <View className="p-3">
        {!!(product as any).recommendationReason && (
          <Text className="text-primary/80 text-xs mb-2 italic" numberOfLines={2}>
            {(product as any).recommendationReason}
          </Text>
        )}
        <Text className="text-text-primary font-bold text-sm mb-1" numberOfLines={1}>
          {product.name}
        </Text>

        <View className="flex-row items-center mb-2">
          <Ionicons name="star" size={12} color="#FFC107" />
          <Text className="text-text-primary text-xs font-semibold ml-1">
            {product.averageRating.toFixed(1)}
          </Text>
        </View>

        <View className="flex-row items-center justify-between mt-auto pt-2">
          <View>
            <Text className="text-primary font-bold text-lg">
              ${(product.discountedPrice ?? product.price).toFixed(2)}
            </Text>
            {product.discountedPrice && product.discountedPrice < product.price && (
              <Text className="text-text-secondary text-[10px] line-through">
                ${product.price.toFixed(2)}
              </Text>
            )}
          </View>
          <TouchableOpacity
            className="bg-primary rounded-full w-8 h-8 items-center justify-center"
            activeOpacity={0.7}
            onPress={() => handleAddToCart(product._id, product.name)}
            disabled={isAddingToCart}
          >
            {isAddingToCart ? (
              <ActivityIndicator size="small" color="#121212" />
            ) : (
              <Ionicons name="add" size={18} color="#121212" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View className="py-6 mb-4">
        <Text className="text-text-primary text-lg font-bold mb-4 px-6">{title}</Text>
        <ActivityIndicator size="small" color="#00D9FF" />
      </View>
    );
  }

  if (isError || !products || products.length === 0) return null;

  return (
    <View className="mb-8 font-primary">
      <View className="flex-row items-center px-6 mb-4 gap-2">
        <Text className="text-text-primary text-xl font-bold">{title}</Text>
        {!!aiEnhanced && <Ionicons name="sparkles" size={18} color="#00D9FF" />}
      </View>
      <FlatList
        data={products}
        renderItem={renderProduct}
        keyExtractor={(item) => item._id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24 }}
      />
    </View>
  );
};

export default HorizontalProductList;
