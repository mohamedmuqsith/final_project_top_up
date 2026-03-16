import RatingModal from "@/components/RatingModal";
import SafeScreen from "@/components/SafeScreen";
import { useOrders } from "@/hooks/useOrders";
import { useReviews } from "@/hooks/useReviews";
import { capitalizeFirstLetter, formatDate, getStatusColor } from "@/lib/utils";
import { Order } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";

function OrdersScreen() {
  const { data: orders, isLoading, isError } = useOrders();
  const { createReviewAsync, isCreatingReview } = useReviews();

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [productRatings, setProductRatings] = useState<{ [key: string]: number }>({});
  const [productComments, setProductComments] = useState<{ [key: string]: string }>({});
  const [productTitles, setProductTitles] = useState<{ [key: string]: string }>({});

  const handleOpenRating = (order: Order) => {
    setShowRatingModal(true);
    setSelectedOrder(order);

    // init states for each product
    const initialRatings: { [key: string]: number } = {};
    const initialComments: { [key: string]: string } = {};
    const initialTitles: { [key: string]: string } = {};
    
    order.orderItems.forEach((item) => {
      const productId = item.product._id || (item.product as any);
      initialRatings[productId] = 0;
      initialComments[productId] = "";
      initialTitles[productId] = "";
    });
    
    setProductRatings(initialRatings);
    setProductComments(initialComments);
    setProductTitles(initialTitles);
  };

  const handleSubmitRating = async () => {
    if (!selectedOrder) return;

    // check if any product has been rated
    const hasAnyRating = Object.values(productRatings).some((rating) => rating > 0);
    if (!hasAnyRating) {
      Alert.alert("Error", "Please rate at least one product");
      return;
    }

    try {
      // Filter items that actually have a rating selected
      const ratedItems = selectedOrder.orderItems.filter(item => {
        const pid = item.product?._id || item.product;
        return pid && productRatings[pid as string] > 0;
      });
      
      await Promise.all(
        ratedItems.map((item) => {
          const pid = (item.product?._id || item.product) as string;
          return createReviewAsync({
            productId: pid,
            orderId: selectedOrder._id,
            rating: productRatings[pid],
            comment: productComments[pid],
            title: productTitles[pid],
          });
        })
      );

      Alert.alert("Success", "Reviews submitted successfully!");
      setShowRatingModal(false);
      setSelectedOrder(null);
      setProductRatings({});
      setProductComments({});
      setProductTitles({});
    } catch (error: any) {
      console.error("Error submitting reviews:", error);
      Alert.alert("Error", error?.response?.data?.error || "Failed to submit rating");
    }
  };

  return (
    <SafeScreen>
      {/* Header */}
      <View className="px-6 pb-5 border-b border-surface flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-text-primary text-2xl font-bold">My Orders</Text>
      </View>

      {isLoading ? (
        <LoadingUI />
      ) : isError ? (
        <ErrorUI />
      ) : !orders || orders.length === 0 ? (
        <EmptyUI />
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          <View className="px-6 py-4">
            {orders.map((order) => {
              const totalItems = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
              const firstImage = order.orderItems[0]?.image || "";

              return (
                <TouchableOpacity
                  key={order._id}
                  className="bg-surface rounded-3xl p-5 mb-4"
                  activeOpacity={0.7}
                  onPress={() => router.push(`/(profile)/order/${order._id}`)}
                >
                  <View className="flex-row mb-4">
                    <View className="relative">
                      <Image
                        source={firstImage}
                        style={{ height: 80, width: 80, borderRadius: 8 }}
                        contentFit="cover"
                      />

                      {/* BADGE FOR MORE ITEMS */}
                      {order.orderItems.length > 1 && (
                        <View className="absolute -bottom-1 -right-1 bg-primary rounded-full size-7 items-center justify-center">
                          <Text className="text-background text-xs font-bold">
                            +{order.orderItems.length - 1}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="flex-1 ml-4">
                      <Text className="text-text-primary font-bold text-base mb-1">
                        Order #{order._id.slice(-8).toUpperCase()}
                      </Text>
                      <Text className="text-text-secondary text-sm mb-2">
                        {formatDate(order.createdAt)}
                      </Text>
                      <View
                        className="self-start px-3 py-1.5 rounded-full"
                        style={{ backgroundColor: getStatusColor(order.status) + "20" }}
                      >
                        <Text
                          className="text-xs font-bold"
                          style={{ color: getStatusColor(order.status) }}
                        >
                          {capitalizeFirstLetter(order.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* ORDER ITEMS SUMMARY */}
                  {order.orderItems.map((item, index) => (
                    <View key={item._id} className="flex-row items-center justify-between">
                      <Text
                        className="text-text-secondary text-sm flex-1"
                        numberOfLines={1}
                      >
                        {item.name} × {item.quantity}
                      </Text>
                      {item.hasReviewed && (
                        <Ionicons name="checkmark-circle" size={14} color="#1DB954" className="ml-2" />
                      )}
                    </View>
                  ))}

                  <View className="border-t border-background-lighter pt-3 flex-row justify-between items-center">
                    <View>
                      <Text className="text-text-secondary text-xs mb-1">{totalItems} items</Text>
                      <Text className="text-primary font-bold text-xl">
                        ${order.totalPrice.toFixed(2)}
                      </Text>
                    </View>

                    {order.status === "delivered" &&
                      (order.hasReviewed ? (
                        <View className="bg-primary/20 px-5 py-3 rounded-full flex-row items-center">
                          <Ionicons name="checkmark-circle" size={18} color="#1DB954" />
                          <Text className="text-primary font-bold text-sm ml-2">Reviewed</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          className="bg-primary px-5 py-3 rounded-full flex-row items-center"
                          activeOpacity={0.7}
                          onPress={() => handleOpenRating(order)}
                        >
                          <Ionicons name="star" size={18} color="#121212" />
                          <Text className="text-background font-bold text-sm ml-2">
                            Leave Rating
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </View>

                  {/* Tap to view details hint */}
                  <View className="flex-row items-center justify-center mt-3 pt-3 border-t border-background-lighter">
                    <Text className="text-text-secondary text-xs mr-1">Tap for details</Text>
                    <Ionicons name="chevron-forward" size={14} color="#666" />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        order={selectedOrder}
        productRatings={productRatings}
        productComments={productComments}
        productTitles={productTitles}
        onSubmit={handleSubmitRating}
        isSubmitting={isCreatingReview}
        onRatingChange={(productId, rating) =>
          setProductRatings((prev) => ({ ...prev, [productId]: rating }))
        }
        onCommentChange={(productId, comment) =>
          setProductComments((prev) => ({ ...prev, [productId]: comment }))
        }
        onTitleChange={(productId, title) =>
          setProductTitles((prev) => ({ ...prev, [productId]: title }))
        }
      />
    </SafeScreen>
  );
}
export default OrdersScreen;

function LoadingUI() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#00D9FF" />
      <Text className="text-text-secondary mt-4">Loading orders...</Text>
    </View>
  );
}

function ErrorUI() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
      <Text className="text-text-primary font-semibold text-xl mt-4">Failed to load orders</Text>
      <Text className="text-text-secondary text-center mt-2">
        Please check your connection and try again
      </Text>
    </View>
  );
}

function EmptyUI() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <Ionicons name="receipt-outline" size={80} color="#666" />
      <Text className="text-text-primary font-semibold text-xl mt-4">No orders yet</Text>
      <Text className="text-text-secondary text-center mt-2">
        Your order history will appear here
      </Text>
    </View>
  );
}
