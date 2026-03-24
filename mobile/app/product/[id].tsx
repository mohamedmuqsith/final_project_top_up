import SafeScreen from "@/components/SafeScreen";
import { useProduct } from "@/hooks/useProduct";
import useCart from "@/hooks/useCart";
import { useProductReviews } from "@/hooks/useReviews";
import useWishlist from "@/hooks/useWishlist";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import HorizontalProductList from "@/components/HorizontalProductList";
import { useSimilarProducts, useFrequentlyBoughtTogether } from "@/hooks/useRecommendations";
import { View, Text, Alert, ActivityIndicator, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { useCurrency } from "@/components/CurrencyProvider";
import { formatCurrency } from "@/lib/currencyUtils";

const { width } = Dimensions.get("window");

const ProductDetailScreen = () => {
  const { currency } = useCurrency();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isError, isLoading } = useProduct(id);
  const { data: similarData, isLoading: similarLoading, isError: similarError } = useSimilarProducts(id);
  const { data: boughtTogetherData, isLoading: boughtTogetherLoading, isError: boughtTogetherError } = useFrequentlyBoughtTogether(id);
  const { addToCart, isAddingToCart } = useCart();
  const { data: reviewsData, isLoading: reviewsLoading } = useProductReviews(id as string);
  const { isInWishlist, toggleWishlist, isAddingToWishlist, isRemovingFromWishlist } =
    useWishlist();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const handleAddToCart = () => {
    if (!product) return;
    addToCart(
      { productId: product._id, quantity },
      {
        onSuccess: () => Alert.alert("Success", `${product.name} added to cart!`),
        onError: (error: any) => {
          Alert.alert("Error", error?.response?.data?.error || "Failed to add to cart");
        },
      }
    );
  };

  if (isLoading) return <LoadingUI />;
  if (isError || !product) return <ErrorUI />;

  const inStock = product.stock > 0;

  return (
    <SafeScreen>
      {/* HEADER */}
      <View className="absolute top-0 left-0 right-0 z-10 px-6 pt-20 pb-4 flex-row items-center justify-between">
        <TouchableOpacity
          className="bg-black/50 backdrop-blur-xl w-12 h-12 rounded-full items-center justify-center"
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          className={`w-12 h-12 rounded-full items-center justify-center ${isInWishlist(product._id) ? "bg-primary" : "bg-black/50 backdrop-blur-xl"
            }`}
          onPress={() => toggleWishlist(product._id)}
          disabled={isAddingToWishlist || isRemovingFromWishlist}
          activeOpacity={0.7}
        >
          {isAddingToWishlist || isRemovingFromWishlist ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons
              name={isInWishlist(product._id) ? "heart" : "heart-outline"}
              size={24}
              color={isInWishlist(product._id) ? "#121212" : "#FFFFFF"}
            />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* IMAGE GALLERY */}
        <View className="relative">
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              setSelectedImageIndex(index);
            }}
          >
            {product.images.map((image: { url: string; publicId: string }, index: number) => (
              <View key={index} style={{ width }}>
                <Image source={{ uri: image.url }} style={{ width, height: 400 }} contentFit="cover" />
              </View>
            ))}
          </ScrollView>

          {/* Image Indicators */}
          <View className="absolute bottom-4 left-0 right-0 flex-row justify-center gap-2">
            {product.images.map((_: { url: string; publicId: string }, index: number) => (
              <View
                key={index}
                className={`h-2 rounded-full ${index === selectedImageIndex ? "bg-primary w-6" : "bg-white/50 w-2"
                  }`}
              />
            ))}
          </View>
        </View>

        {/* PRODUCT INFO */}
        <View className="p-6">
          {/* Category */}
          <View className="flex-row items-center mb-3">
            <View className="bg-primary/20 px-3 py-1 rounded-full">
              <Text className="text-primary text-xs font-bold">{product.category}</Text>
            </View>
          </View>

          {/* Product Name */}
          <Text className="text-text-primary text-3xl font-bold mb-3">{product.name}</Text>

          {/* Rating & Reviews */}
          <View className="flex-row items-center mb-4">
            <View className="flex-row items-center bg-surface px-3 py-2 rounded-full">
              <Ionicons name="star" size={16} color="#FFC107" />
              <Text className="text-text-primary font-bold ml-1 mr-2">
                {product.averageRating.toFixed(1)}
              </Text>
              <Text className="text-text-secondary text-sm">({product.reviewCount} reviews)</Text>
            </View>
            {inStock ? (
              <View className="ml-3 flex-row items-center">
                <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <Text className="text-green-500 font-semibold text-sm">
                  {product.stock} in stock
                </Text>
              </View>
            ) : (
              <View className="ml-3 flex-row items-center">
                <View className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                <Text className="text-red-500 font-semibold text-sm">Out of Stock</Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center gap-4 mb-6">
            <View>
              <Text className={`text-4xl font-black tracking-tight ${product.hasActiveOffer ? "text-red-500" : "text-primary"}`}>
                {formatCurrency(product.discountedPrice ?? product.price, currency)}
              </Text>
              {product.hasActiveOffer && product.originalPrice && (
                <View className="flex-row items-center mt-1.5">
                   <Text className="text-text-secondary text-base line-through font-bold opacity-60">
                     {formatCurrency(product.originalPrice, currency)}
                   </Text>
                </View>
              )}
            </View>

            {product.hasActiveOffer && (
               <View className="bg-red-500/15 border border-red-500/30 px-3 py-2 rounded-2xl flex-row items-center gap-1.5">
                 <Ionicons name="flash" size={14} color="#ef4444" />
                 <Text className="text-red-500 font-bold text-sm tracking-wide">
                    {product.appliedOffer?.type === "percentage" 
                      ? `${product.appliedOffer.value}% OFF`
                      : `SAVE ${formatCurrency(product.savingsAmount || 0, currency)}`}
                 </Text>
               </View>
            )}
          </View>

          {product.hasActiveOffer && product.appliedOffer && (
            <View className="bg-red-500/10 p-4 rounded-3xl mb-6 border border-red-500/20 flex-row items-center gap-4 shadow-sm relative overflow-hidden">
              <View className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-500/40">
                <Ionicons name="pricetag" size={24} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary font-black text-lg">{product.offerLabel || product.appliedOffer.title}</Text>
                <Text className="text-red-400 font-bold text-[10px] mt-0.5 uppercase tracking-widest">{product.appliedOffer.bannerText || "Limited time offer unlocked!"}</Text>
              </View>
            </View>
          )}

          {/* Quantity */}
          <View className="mb-6">
            <Text className="text-text-primary text-lg font-bold mb-3">Quantity</Text>

            <View className="flex-row items-center">
              <TouchableOpacity
                className="bg-surface rounded-full w-12 h-12 items-center justify-center"
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                activeOpacity={0.7}
                disabled={!inStock}
              >
                <Ionicons name="remove" size={24} color={inStock ? "#FFFFFF" : "#666"} />
              </TouchableOpacity>

              <Text className="text-text-primary text-xl font-bold mx-6">{quantity}</Text>

              <TouchableOpacity
                className="bg-primary rounded-full w-12 h-12 items-center justify-center"
                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
                activeOpacity={0.7}
                disabled={!inStock || quantity >= product.stock}
              >
                <Ionicons
                  name="add"
                  size={24}
                  color={!inStock || quantity >= product.stock ? "#666" : "#121212"}
                />
              </TouchableOpacity>
            </View>

            {quantity >= product.stock && inStock && (
              <Text className="text-orange-500 text-sm mt-2">Maximum stock reached</Text>
            )}
          </View>

          {/* Description */}
          <View className="mb-8">
            <Text className="text-text-primary text-lg font-bold mb-3">Description</Text>
            <Text className="text-text-secondary text-base leading-6">{product.description}</Text>
          </View>

          {/* REVIEWS SECTION */}
          <View className="mb-8">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-text-primary text-xl font-bold">Customer Reviews</Text>
              <View className="flex-row items-center">
                <Ionicons name="star" size={18} color="#FFC107" />
                <Text className="text-text-primary font-bold ml-1 text-lg">
                  {product.averageRating.toFixed(1)}
                </Text>
              </View>
            </View>

            {/* Review List */}
            {reviewsLoading ? (
              <ActivityIndicator color="#1DB954" className="my-4" />
            ) : reviewsData?.reviews && reviewsData.reviews.length > 0 ? (
              <View className="gap-4">
                {reviewsData.reviews.map((review) => (
                  <View key={review._id} className="bg-surface p-4 rounded-2xl border border-white/5">
                    <View className="flex-row justify-between items-start mb-2">
                      <View className="flex-row items-center">
                        <View className="w-10 h-10 rounded-full bg-primary/20 items-center justify-center overflow-hidden mr-3">
                          {typeof review.userId !== "string" && review.userId.imageUrl ? (
                            <Image
                              source={review.userId.imageUrl}
                              style={{ width: 40, height: 40 }}
                            />
                          ) : (
                            <Text className="text-primary font-bold">
                              {typeof review.userId !== "string" ? review.userId.name.charAt(0) : "U"}
                            </Text>
                          )}
                        </View>
                        <View>
                          <Text className="text-text-primary font-bold">
                            {typeof review.userId !== "string" ? review.userId.name : "Customer"}
                          </Text>
                          <View className="flex-row items-center mt-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Ionicons
                                key={s}
                                name={s <= review.rating ? "star" : "star-outline"}
                                size={12}
                                color={s <= review.rating ? "#FFC107" : "#666"}
                                style={{ marginRight: 1 }}
                              />
                            ))}
                            {review.isVerifiedPurchase && (
                              <View className="flex-row items-center ml-2 bg-green-500/10 px-1.5 py-0.5 rounded">
                                <Ionicons name="checkmark-circle" size={10} color="#10B981" />
                                <Text className="text-[10px] text-green-500 font-bold ml-0.5">Verified</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                      <Text className="text-text-secondary text-[10px]">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                    {!!review.title && (
                      <Text className="text-text-primary font-bold text-sm mb-1">{review.title}</Text>
                    )}
                    <Text className="text-text-secondary text-sm leading-5">
                      {review.comment || "No comment provided."}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-surface p-6 rounded-2xl items-center border border-dashed border-white/10">
                <View className="mb-2">
                  <Ionicons name="chatbubble-outline" size={32} color="#666" />
                </View>
                <Text className="text-text-secondary text-center">No reviews yet. Be the first to share your thoughts!</Text>
              </View>
            )}

            {/* Eligibility Note for reviews is handled by the "Write Review" button visibility if we had orders context here */}
          </View>
        </View>

        {/* Similar Products (Gemini Enhanced) */}
        <HorizontalProductList
          title="Similar Products"
          products={similarData?.recommendations}
          isLoading={similarLoading}
          isError={similarError}
          aiEnhanced={similarData?.aiEnhanced}
        />

        {/* Frequently Bought Together */}
        <HorizontalProductList
          title="Frequently Bought Together"
          products={boughtTogetherData?.recommendations}
          isLoading={boughtTogetherLoading}
          isError={boughtTogetherError}
          aiEnhanced={boughtTogetherData?.aiEnhanced}
        />
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-surface px-6 py-4 pb-8">
        <View className="flex-row items-center gap-3">
          <View className="flex-1">
            <Text className="text-text-secondary text-sm mb-1">Total Price</Text>
            <Text className="text-primary text-2xl font-bold">
              {formatCurrency((product.discountedPrice ?? product.price) * quantity, currency)}
            </Text>
          </View>
          <TouchableOpacity
            className={`rounded-2xl px-8 py-4 flex-row items-center ${!inStock ? "bg-surface" : "bg-primary"
              }`}
            activeOpacity={0.8}
            onPress={handleAddToCart}
            disabled={!inStock || isAddingToCart}
          >
            {isAddingToCart ? (
              <ActivityIndicator size="small" color="#121212" />
            ) : (
              <>
                <Ionicons name="cart" size={24} color={!inStock ? "#666" : "#121212"} />
                <Text
                  className={`font-bold text-lg ml-2 ${!inStock ? "text-text-secondary" : "text-background"
                    }`}
                >
                  {!inStock ? "Out of Stock" : "Add to Cart"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeScreen>
  );
};

export default ProductDetailScreen;

function ErrorUI() {
  return (
    <SafeScreen>
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text className="text-text-primary font-semibold text-xl mt-4">Product not found</Text>
        <Text className="text-text-secondary text-center mt-2">
          This product may have been removed or doesn&apos;t exist
        </Text>
        <TouchableOpacity
          className="bg-primary rounded-2xl px-6 py-3 mt-6"
          onPress={() => router.back()}
        >
          <Text className="text-background font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    </SafeScreen>
  );
}

function LoadingUI() {
  return (
    <SafeScreen>
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#00D9FF" />
        <Text className="text-text-secondary mt-4">Loading product...</Text>
      </View>
    </SafeScreen>
  );
}
