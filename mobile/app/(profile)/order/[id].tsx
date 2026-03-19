import SafeScreen from "@/components/SafeScreen";
import { Ionicons } from "@expo/vector-icons";
import { useOrders, useRequestReturn, useOrderDocument } from "@/hooks/useOrders";
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
  const { mutateAsync: requestReturn, isPending: isRequestingReturn } = useRequestReturn();
  const { refetch: fetchInvoice, isFetching: isFetchingInvoice } = useOrderDocument(id, "invoice");
  const queryClient = useQueryClient();

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [productRatings, setProductRatings] = useState<{ [key: string]: number }>({});
  const [productComments, setProductComments] = useState<{ [key: string]: string }>({});
  const [productTitles, setProductTitles] = useState<{ [key: string]: string }>({});

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

  // Build a fixed 4-step sequence, mapping dates from history if they exist
  const getHistoryEntry = (statusToFind: string) => 
    order.statusHistory?.find(h => h.status.toLowerCase() === statusToFind);

  const pendingEntry = getHistoryEntry("pending");
  const processingEntry = getHistoryEntry("processing");
  const shippedEntry = getHistoryEntry("shipped");
  const deliveredEntry = getHistoryEntry("delivered");
  const cancelledEntry = getHistoryEntry("cancelled");
  const returnRequested = getHistoryEntry("return-requested") || getHistoryEntry("requested");
  const returnApproved = getHistoryEntry("approved");
  const deniedEntry = getHistoryEntry("denied");
  const refundedEntry = getHistoryEntry("refunded");

  const isCancelled = order.status === "cancelled";

  const timelineEvents = [
    { 
      label: "Pending", 
      date: pendingEntry?.timestamp || order.createdAt, 
      active: true, 
      comment: pendingEntry?.comment || "Awaiting processing", 
      isError: false, 
      isReturn: false 
    },
    ...(!isCancelled ? [
      { 
        label: "Processing", 
        date: processingEntry?.timestamp || null, 
        active: ["processing", "shipped", "delivered"].includes(order.status), 
        comment: processingEntry?.comment, 
        isError: false, 
        isReturn: false 
      },
      { 
        label: "Shipped", 
        date: order.shippedAt || shippedEntry?.timestamp || null, 
        active: ["shipped", "delivered"].includes(order.status), 
        comment: shippedEntry?.comment, 
        isError: false, 
        isReturn: false 
      },
      { 
        label: "Delivered", 
        date: order.deliveredAt || deliveredEntry?.timestamp || null, 
        active: order.status === "delivered", 
        comment: deliveredEntry?.comment, 
        isError: false, 
        isReturn: false 
      }
    ] : [
      { 
        label: "Cancelled", 
        date: cancelledEntry?.timestamp || order.updatedAt, 
        active: true, 
        isError: true, 
        isReturn: false, 
        comment: cancelledEntry?.comment || "Order was cancelled" 
      }
    ])
  ];

  // Append any return/refund states if present
  if (returnRequested) {
    timelineEvents.push({
      label: "Return Requested",
      date: returnRequested.timestamp,
      active: true,
      isError: false,
      isReturn: true,
      comment: returnRequested.comment
    });
  }
  if (deniedEntry) {
    timelineEvents.push({
      label: "Return Denied",
      date: deniedEntry.timestamp,
      active: true,
      isError: true,
      isReturn: false,
      comment: deniedEntry.comment
    });
  } else if (returnApproved) {
    timelineEvents.push({
      label: "Return Approved",
      date: returnApproved.timestamp,
      active: true,
      isError: false,
      isReturn: true,
      comment: returnApproved.comment
    });
  }
  if (refundedEntry) {
    timelineEvents.push({
      label: "Refund Processed",
      date: refundedEntry.timestamp,
      active: true,
      isError: false,
      isReturn: true,
      comment: refundedEntry.comment
    });
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

  const handleRequestReturn = () => {
    if (!isReturnEligible) return;

    Alert.prompt(
      "Request Return",
      "Please provide a reason for your return request:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async (reason?: string) => {
            if (!reason?.trim()) {
              Alert.alert("Error", "Reason is required for return request");
              return;
            }
            try {
              await requestReturn({ orderId: order._id, reason: reason.trim() });
              Alert.alert("Success", "Your return request has been submitted.");
            } catch (error: any) {
              // Extraction happens in useRequestReturn hook, so error.message is the specific string
              Alert.alert("Request Denied", error?.message || "Failed to submit return request");
            }
          }
        }
      ],
      'plain-text'
    );
  };


  const handleOpenRating = () => {
    // init ratings for all products to 0
    const initialRatings: { [key: string]: number } = {};
    const initialComments: { [key: string]: string } = {};
    const initialTitles: { [key: string]: string } = {};

    order.orderItems.forEach((item) => {
      const productId = (item.product?._id || item.product) as string;
      initialRatings[productId] = 0;
      initialComments[productId] = "";
      initialTitles[productId] = "";
    });
    setProductRatings(initialRatings);
    setProductComments(initialComments);
    setProductTitles(initialTitles);
    setShowRatingModal(true);
  };

  const handleViewInvoice = async () => {
    try {
      const { data: invoice } = await fetchInvoice();
      if (!invoice) throw new Error("Could not fetch invoice data");

      // Logic: Show summarized view or implement PDF printing if needed
      // To satisfy "production-ready", we show a clean structured overview for now
      // Real document apps would use expo-print here
      Alert.alert(
        "Invoice: " + invoice.invoiceNumber,
        `Date: ${formatDate(invoice.orderDate)}\n\n` +
        `Customer: ${invoice.customer.fullName}\n` +
        `Total: $${invoice.pricing.total.toFixed(2)}\n\n` +
        `Store: ${invoice.store.name}\n` +
        `Location: ${invoice.store.city}, ${invoice.store.province}`,
        [{ text: "OK", onPress: () => {} }]
      );
    } catch (error: any) {
      Alert.alert("Invoice Unavailable", error?.message || "Failed to load invoice");
    }
  };

  const isInvoiceEligible = ["pending", "processing", "shipped", "delivered"].includes(order.status);
  
  const isReturnEligible = 
    order.status === "delivered" && 
    (!order.returnStatus || order.returnStatus === "none") &&
    (order.deliveredAt ? (new Date().getTime() - new Date(order.deliveredAt).getTime()) < 14 * 24 * 60 * 60 * 1000 : false);

  const handleSubmitRating = async () => {
    // check if any product has been rated
    const hasAnyRating = Object.values(productRatings).some((rating) => rating > 0);
    if (!hasAnyRating) {
      Alert.alert("Error", "Please rate at least one product");
      return;
    }

    try {
      const ratedItems = order.orderItems.filter(item => {
        const pid = (item.product?._id || item.product) as string;
        return pid && productRatings[pid] > 0;
      });

      await Promise.all(
        ratedItems.map((item) => {
          const pid = (item.product?._id || item.product) as string;
          return createReviewAsync({
            productId: pid,
            orderId: order._id,
            rating: productRatings[pid],
            comment: productComments[pid],
            title: productTitles[pid],
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
      setProductTitles({});
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
              const color = event.isError ? "#FF6B6B" : (event as any).isReturn ? "#FFC107" : event.active ? "#00D9FF" : "#333333";
              
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
                    {event.comment && (
                      <Text className="text-text-secondary/60 text-[10px] mt-1 italic">
                        "{event.comment}"
                      </Text>
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

        {/* Actions Section */}
        <View className="px-6 mb-10">
          <Text className="text-text-primary font-bold text-lg mb-4">Order Actions</Text>
          <View className="gap-4">
            {/* Primary Action: Reorder */}
            <TouchableOpacity
              className="bg-[#00D9FF] rounded-2xl py-4 flex-row items-center justify-center shadow-lg shadow-[#00D9FF]/30"
              activeOpacity={0.7}
              onPress={handleReorder}
            >
              <Ionicons name="refresh" size={22} color="#000000" />
              <Text className="text-[#000000] font-black text-base ml-2">Order Again</Text>
            </TouchableOpacity>

            <View className="flex-row gap-3">
              {/* View Invoice */}
              {isInvoiceEligible && (
                <TouchableOpacity
                  className="flex-1 bg-surface-lighter border border-text-primary/10 rounded-2xl py-4 flex-row items-center justify-center"
                  activeOpacity={0.7}
                  onPress={handleViewInvoice}
                  disabled={isFetchingInvoice}
                >
                  <Ionicons name="document-text-outline" size={20} color="#FFFFFF" />
                  <Text className="text-white font-bold text-sm ml-2">View Invoice</Text>
                </TouchableOpacity>
              )}

              {/* Leave/Edit Rating */}
              {order.status === "delivered" && (
                <TouchableOpacity
                  className="flex-1 bg-surface-lighter border border-primary/20 rounded-2xl py-4 flex-row items-center justify-center"
                  activeOpacity={0.7}
                  onPress={handleOpenRating}
                >
                  <Ionicons name="star" size={20} color="#FFD700" />
                  <Text className="text-white font-bold text-sm ml-2">
                    {order.hasReviewed ? "Edit Rating" : "Rate Order"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Request Return */}
            {isReturnEligible && (
              <TouchableOpacity
                className="bg-error/10 border border-error/30 rounded-2xl py-4 flex-row items-center justify-center"
                activeOpacity={0.7}
                onPress={handleRequestReturn}
                disabled={isRequestingReturn}
              >
                {isRequestingReturn ? (
                  <ActivityIndicator size="small" color="#FF6666" />
                ) : (
                  <>
                    <Ionicons name="return-up-back" size={22} color="#FF6666" />
                    <Text className="text-[#FF6666] font-extrabold text-base ml-2">Request Return</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {/* Return Status Summary */}
            {order.returnStatus && order.returnStatus !== 'none' && (
              <View className="bg-surface-lighter rounded-2xl p-4 border border-text-primary/5 items-center flex-row justify-center">
                <View 
                  className="w-2 h-2 rounded-full mr-3" 
                  style={{ backgroundColor: order.returnStatus === 'denied' ? "#FF6B6B" : "#FFC107" }} 
                />
                <Text className="text-text-secondary font-semibold text-sm">
                  Return Status: <Text className="text-text-primary">{capitalizeFirstLetter(order.returnStatus)}</Text>
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        order={order}
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
