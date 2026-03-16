import SafeScreen from "@/components/SafeScreen";
import { Ionicons } from "@expo/vector-icons";
import { useOrders } from "@/hooks/useOrders";
import { capitalizeFirstLetter, formatDate, getStatusColor } from "@/lib/utils";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View, TouchableOpacity, Alert } from "react-native";
import useCart from "@/hooks/useCart";
import RatingModal from "@/components/RatingModal";
import { useReviews } from "@/hooks/useReviews";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: orders, isLoading } = useOrders();
  const { addToCart } = useCart();
  const { createReviewAsync, isCreatingReview } = useReviews();
  const queryClient = useQueryClient();

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [productRatings, setProductRatings] = useState<{ [key: string]: number }>({});
  const [productComments, setProductComments] = useState<{ [key: string]: string }>({});

  const order = orders?.find((o) => o._id === id);

  if (isLoading) {
    return (
      <SafeScreen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#00D9FF" />
        </View>
      </SafeScreen>
    );
  }

  if (!order) {
    return (
      <SafeScreen>
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle-outline" size={64} color="#666" />
          <Text className="text-text-primary text-xl font-bold mt-4">Order Not Found</Text>
          <TouchableOpacity 
            className="mt-6 bg-surface px-6 py-3 rounded-full"
            onPress={() => router.back()}
          >
            <Text className="text-text-primary font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeScreen>
    );
  }

  const timelineEvents: { label: string; date: string | null | undefined; active: boolean; isError?: boolean }[] = [
    { label: "Order Placed", date: order.createdAt, active: true },
    { label: "Processing", date: null, active: ["processing", "shipped", "delivered"].includes(order.status as any) },
    { label: "Shipped", date: (order as any).shippedAt, active: ["shipped", "delivered"].includes(order.status as any) },
    { label: "Delivered", date: (order as any).deliveredAt, active: order.status === "delivered" },
  ];

  if ((order.status as any) === "cancelled") {
    timelineEvents.push({ label: "Cancelled", date: order.updatedAt, active: true, isError: true });
  }

  const handleReorder = () => {
    order.orderItems.forEach((item) => {
      // Add items back to cart
      addToCart({
        productId: item.product._id || (item.product as any),
        quantity: 1
      });
    });
    router.push("/(tabs)/cart");
  };

  const handleOpenRating = () => {
    // init ratings for all product to 0
    const initialRatings: { [key: string]: number } = {};
    const initialComments: { [key: string]: string } = {};
    
    order.orderItems.forEach((item) => {
      const productId = item.product._id || (item.product as any);
      initialRatings[productId] = 0;
      initialComments[productId] = "";
    });
    setProductRatings(initialRatings);
    setProductComments(initialComments);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    // check if all products have been rated
    const allRated = Object.values(productRatings).every((rating) => rating > 0);
    if (!allRated) {
      Alert.alert("Error", "Please rate all products");
      return;
    }

    try {
      await Promise.all(
        order.orderItems.map((item) => {
          return createReviewAsync({
            productId: item.product._id || (item.product as any),
            orderId: order._id,
            rating: productRatings[item.product._id || (item.product as any)],
            comment: productComments[item.product._id || (item.product as any)] || "",
          });
        })
      );
      
      // Force refresh of orders that might contain these products
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      // Invalidate specific product reviews
      order.orderItems.forEach(item => {
        const productId = item.product._id || (item.product as any);
        queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
        queryClient.invalidateQueries({ queryKey: ["product", productId] });
      });

      Alert.alert("Success", "Thank you for rating your order!");
      setShowRatingModal(false);
      setProductRatings({});
      setProductComments({});
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.error || "Failed to submit rating");
    }
  };

  return (
    <SafeScreen>
      <View className="px-6 pb-5 border-b border-surface flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-text-primary text-xl font-bold">Order Details</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Header Summary */}
        <View className="px-6 mt-6 mb-8 items-center">
          <View 
            className="px-4 py-2 rounded-full mb-3"
            style={{ backgroundColor: getStatusColor(order.status) + "20" }}
          >
            <Text className="text-sm font-bold tracking-wide" style={{ color: getStatusColor(order.status) }}>
              {capitalizeFirstLetter(order.status)}
            </Text>
          </View>
          <Text className="text-text-primary text-3xl font-bold">${order.totalPrice.toFixed(2)}</Text>
          <Text className="text-text-secondary mt-1">Order #{order._id.slice(-8).toUpperCase()}</Text>
          <Text className="text-text-secondary/70 text-xs mt-1">{formatDate(order.createdAt)}</Text>
        </View>

        {/* Timeline */}
        <View className="px-6 mb-8">
          <Text className="text-text-primary font-bold text-lg mb-4">Tracking</Text>
          <View className="bg-surface rounded-3xl p-5">
            {timelineEvents.map((event, index) => {
              const isLast = index === timelineEvents.length - 1;
              const color = event.isError ? "#FF6B6B" : event.active ? "#00D9FF" : "#333333";
              
              return (
                <View key={index} className="flex-row">
                  <View className="items-center mr-4">
                    <View className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
                    {!isLast && <View className="w-0.5 h-10 my-1" style={{ backgroundColor: color }} />}
                  </View>
                  <View className="flex-1 pb-6">
                    <Text className="text-base font-bold" style={{ color: event.active ? "#FFF" : "#666" }}>
                      {event.label}
                    </Text>
                    {event.date && (
                      <Text className="text-text-secondary text-xs mt-1">{formatDate(event.date)}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Items */}
        <View className="px-6 mb-8">
          <Text className="text-text-primary font-bold text-lg mb-4">Items ({order.orderItems.reduce((s, i) => s + i.quantity, 0)})</Text>
          <View className="bg-surface rounded-3xl p-2">
            {order.orderItems.map((item, index) => (
              <View 
                key={index}
                className={`flex-row p-3 items-center ${index !== order.orderItems.length - 1 ? "border-b border-background/50" : ""}`}
              >
                <Image 
                  source={item.image || "/placeholder.jpg"} 
                  style={{ width: 60, height: 60, borderRadius: 12 }} 
                />
                <View className="flex-1 ml-4 justify-center">
                  <Text className="text-text-primary font-semibold text-base mb-1" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-text-secondary text-sm">Qty: {item.quantity}</Text>
                </View>
                <Text className="text-text-primary font-bold">${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Shipping Summary */}
        {order.shippingAddress && (
          <View className="px-6 mb-8">
            <Text className="text-text-primary font-bold text-lg mb-4">Shipping To</Text>
            <View className="bg-surface rounded-3xl p-5 flex-row items-start">
              <View className="bg-primary/20 p-2 rounded-full mr-4 mt-1">
                <Ionicons name="location" size={20} color="#00D9FF" />
              </View>
              <View className="flex-1">
                <Text className="text-text-primary font-semibold text-base mb-1">{order.shippingAddress.fullName}</Text>
                <Text className="text-text-secondary text-sm leading-5">
                  {order.shippingAddress.streetAddress}
                </Text>
                <Text className="text-text-secondary text-sm leading-5">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zipCode}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payment Summary */}
        <View className="px-6 mb-8">
          <Text className="text-text-primary font-bold text-lg mb-4">Payment Summary</Text>
          <View className="bg-surface rounded-3xl p-5">
            <View className="flex-row justify-between mb-3">
              <Text className="text-text-secondary">Subtotal</Text>
              <Text className="text-text-primary font-medium">
                ${order.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between mb-3 border-b border-background pb-3">
              <Text className="text-text-secondary">Shipping</Text>
              <Text className="text-[#1DB954] font-medium">Free</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-text-primary font-bold text-base">Total</Text>
              <Text className="text-primary font-bold text-xl">${order.totalPrice.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        {order.status === "delivered" && (
          <View className="p-6">
            {order.status === "delivered" && (
              <View className="gap-3">
                <TouchableOpacity
                  className="bg-primary rounded-2xl py-4 flex-row items-center justify-center mb-0 border border-primary"
                  activeOpacity={0.8}
                  onPress={handleOpenRating}
                >
                  <Ionicons name="star" size={20} color="#121212" />
                  <Text className="text-background font-bold text-base ml-2">
                    {order.reviewedProductIds?.length === order.orderItems.length 
                      ? "Edit Rating" 
                      : "Leave Rating"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="bg-surface-lighter rounded-2xl py-4 flex-row items-center justify-center border border-background-lighter"
                  activeOpacity={0.8}
                  onPress={handleReorder}
                >
                  <Ionicons name="refresh" size={20} color="#FFFFFF" />
                  <Text className="text-text-primary font-bold text-base ml-2">Order Again</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        order={order}
        productRatings={productRatings}
        productComments={productComments}
        onSubmit={handleSubmitRating}
        isSubmitting={isCreatingReview}
        onRatingChange={(productId, rating) =>
          setProductRatings((prev) => ({ ...prev, [productId]: rating }))
        }
        onCommentChange={(productId, comment) =>
          setProductComments((prev) => ({ ...prev, [productId]: comment }))
        }
      />
    </SafeScreen>
  );
}
