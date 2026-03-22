import SafeScreen from "@/components/SafeScreen";
import { useAddresses } from "@/hooks/useAddressess";
import useCart from "@/hooks/useCart";
import { useApi } from "@/lib/api";
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useStripe } from "@stripe/stripe-react-native";
import { useState } from "react";
import { Address } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import OrderSummary from "@/components/OrderSummary";
import AddressSelectionModal from "@/components/AddressSelectionModal";
import { useQueryClient } from "@tanstack/react-query";
import { useCurrency } from "@/components/CurrencyProvider";
import { formatCurrency } from "@/lib/currencyUtils";

import * as Linking from "expo-linking";
import * as Sentry from "@sentry/react-native";

const CartScreen = () => {
  const { currency } = useCurrency();
  const api = useApi();
  const queryClient = useQueryClient();
  const {
    cart,
    cartItemCount,
    cartTotal,
    clearCart,
    isError,
    isLoading,
    isRemoving,
    isUpdating,
    removeFromCart,
    updateQuantity,
  } = useCart();
  const { addresses } = useAddresses();

  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");

  const cartItems = cart?.items || [];
  const subtotal = cartTotal;
  const shipping = 10.0; // $10 shipping fee
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const handleQuantityChange = (productId: string, currentQuantity: number, change: number) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;
    updateQuantity({ productId, quantity: newQuantity });
  };

  const handleRemoveItem = (productId: string, productName: string) => {
    Alert.alert("Remove Item", `Remove ${productName} from cart?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeFromCart(productId),
      },
    ]);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    // check if user has addresses
    if (!addresses || addresses.length === 0) {
      Alert.alert(
        "No Address",
        "Please add a shipping address in your profile before checking out.",
        [{ text: "OK" }]
      );
      return;
    }

    // show address selection modal
    setAddressModalVisible(true);
  };

  const handleProceedWithPayment = async (selectedAddress: Address) => {
    setAddressModalVisible(false);

    // log chechkout initiated
    Sentry.logger.info("Checkout initiated", {
      itemCount: cartItemCount,
      total: total.toFixed(2),
      city: selectedAddress.city,
    });

    try {
      setPaymentLoading(true);

      const validCartItems = cartItems.filter(item => item.product);

      if (validCartItems.length === 0) {
        Alert.alert("Error", "Your cart is empty or contains unavailable items.");
        setPaymentLoading(false);
        return;
      }

      const orderPayload = {
        cartItems: validCartItems.map(item => ({
          product: item.product._id,
          quantity: item.quantity
        })),
        shippingAddress: {
          fullName: selectedAddress.fullName,
          streetAddress: selectedAddress.streetAddress,
          city: selectedAddress.city,
          province: selectedAddress.province,
          zipCode: selectedAddress.zipCode,
          phoneNumber: selectedAddress.phoneNumber,
        },
      };

      if (paymentMethod === "cod") {
        // --- CASH ON DELIVERY FLOW ---
        const { data } = await api.post("/payment/cod-order", orderPayload);
        
        Alert.alert("Order Placed", "Your Cash on Delivery order has been placed successfully!", [
          { text: "OK", onPress: () => {} },
        ]);
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        clearCart();
        return;
      }

      // --- ONLINE PAYMENT FLOW (STRIPE) ---
      const { data } = await api.post("/payment/create-intent", orderPayload);

      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: data.clientSecret,
        merchantDisplayName: "SmartShop Electronics",
        returnURL: Linking.createURL("stripe-redirect"), 
      });

      if (initError) {
        Sentry.logger.error("Payment sheet init failed", {
          errorCode: initError.code,
          errorMessage: initError.message,
          cartTotal: total,
          itemCount: cartItems.length,
        });

        Alert.alert("Error", initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        Sentry.logger.error("Payment cancelled", {
          errorCode: presentError.code,
          errorMessage: presentError.message,
          cartTotal: total,
          itemCount: cartItems.length,
        });

        Alert.alert("Payment cancelled", presentError.message);
      } else {
        // Payment successful on client - now SYNC with backend
        Sentry.logger.info("Payment successful, starting server-side sync", {
          orderId: data.orderId,
          piId: data.paymentIntentId
        });

        // Loop for sync retry logic
        let synced = false;
        let attempts = 0;
        
        const confirmOrder = async () => {
          try {
            setPaymentLoading(true); // Keep spinner active
            await api.post("/payment/confirm", {
              orderId: data.orderId,
              paymentIntentId: data.paymentIntentId
            });
            synced = true;
          } catch (syncErr) {
            console.error("Sync attempt failed:", syncErr);
            throw syncErr;
          }
        };

        try {
          await confirmOrder();
          
          Alert.alert("Success", "Your payment was successful! Your order has been placed and is awaiting processing.", [
            { text: "OK", onPress: () => {} },
          ]);
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          clearCart();
        } catch (syncErr) {
          Sentry.logger.error("Backend sync failed after payment", {
            error: syncErr instanceof Error ? syncErr.message : "Unknown",
            orderId: data.orderId
          });

          Alert.alert(
            "Syncing Problem",
            "Payment was successful, but we're having trouble syncing your order. Please check 'My Orders' in a moment or retry.",
            [
              { text: "Retry Sync", onPress: () => handleManualSync(data.orderId, data.paymentIntentId) },
              { text: "OK", onPress: () => clearCart() } // Clear cart anyway since payment was successful
            ]
          );
        }
      }
    } catch (error: any) {
      Sentry.logger.error("Payment failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        cartTotal: total,
        itemCount: cartItems.length,
      });

      const errorMessage = error?.response?.data?.error || error?.response?.data?.message || "Failed to process payment";
      Alert.alert("Error", errorMessage);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleManualSync = async (orderId: string, paymentIntentId: string) => {
    try {
      setPaymentLoading(true);
      await api.post("/payment/confirm", { orderId, paymentIntentId });
      Alert.alert("Success", "Order synced successfully!");
      clearCart();
    } catch (err) {
      Alert.alert("Sync Error", "Still unable to sync. Please contact support if this persists.");
    } finally {
      setPaymentLoading(false);
    }
  };

  if (isLoading) return <LoadingUI />;
  if (isError) return <ErrorUI />;
  if (cartItems.length === 0) return <EmptyUI />;

  return (
    <SafeScreen>
      <Text className="px-6 pb-5 text-text-primary text-3xl font-bold tracking-tight">Cart</Text>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 240 }}
      >
        <View className="px-6 gap-2">
          {cartItems.map((item, index) => {
            if (!item.product) return null;
            return (
            <View key={item._id} className="bg-surface rounded-3xl overflow-hidden ">
              <View className="p-4 flex-row">
                {/* product image */}
                <View className="relative">
                  <Image
                    source={item.product.images[0]}
                    className="bg-background-lighter"
                    contentFit="cover"
                    style={{ width: 112, height: 112, borderRadius: 16 }}
                  />
                  <View className="absolute top-2 right-2 bg-primary rounded-full px-2 py-0.5">
                    <Text className="text-background text-xs font-bold">×{item.quantity}</Text>
                  </View>
                </View>

                <View className="flex-1 ml-4 justify-between">
                  <View>
                    <Text
                      className="text-text-primary font-bold text-lg leading-tight"
                      numberOfLines={2}
                    >
                      {item.product.name}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <Text className="text-primary font-bold text-2xl">
                        {formatCurrency((item.product.discountedPrice ?? item.product.price) * item.quantity, currency)}
                      </Text>
                      <Text className="text-text-secondary text-sm ml-2">
                        {formatCurrency(item.product.discountedPrice ?? item.product.price, currency)} each
                      </Text>
                      {item.product.hasActiveOffer && item.product.originalPrice && (
                        <Text className="text-text-secondary text-xs line-through ml-2 font-semibold opacity-70">
                          {formatCurrency(item.product.originalPrice, currency)}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View className="flex-row items-center mt-3">
                    <TouchableOpacity
                      className="bg-background-lighter rounded-full w-9 h-9 items-center justify-center"
                      activeOpacity={0.7}
                      onPress={() => handleQuantityChange(item.product._id, item.quantity, -1)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Ionicons name="remove" size={18} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>

                    <View className="mx-4 min-w-[32px] items-center">
                      <Text className="text-text-primary font-bold text-lg">{item.quantity}</Text>
                    </View>

                    <TouchableOpacity
                      className="bg-primary rounded-full w-9 h-9 items-center justify-center"
                      activeOpacity={0.7}
                      onPress={() => handleQuantityChange(item.product._id, item.quantity, 1)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#121212" />
                      ) : (
                        <Ionicons name="add" size={18} color="#121212" />
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      className="ml-auto bg-red-500/10 rounded-full w-9 h-9 items-center justify-center"
                      activeOpacity={0.7}
                      onPress={() => handleRemoveItem(item.product._id, item.product.name)}
                      disabled={isRemoving}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
            );
          })}
        </View>

        {/* Payment Method Selector */}
        <View className="px-6 mt-6 mb-2">
          <Text className="text-text-primary text-xl font-bold mb-4">Payment Method</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setPaymentMethod("online")}
              className={`flex-1 p-4 rounded-3xl border-2 ${
                paymentMethod === "online" ? "border-primary bg-primary/5" : "border-surface bg-surface"
              }`}
            >
              <View className="items-center">
                <Ionicons 
                  name="card" 
                  size={24} 
                  color={paymentMethod === "online" ? "#1DB954" : "#666"} 
                />
                <Text className={`mt-2 font-bold ${paymentMethod === "online" ? "text-primary" : "text-text-secondary"}`}>
                  Online
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMethod("cod")}
              className={`flex-1 p-4 rounded-3xl border-2 ${
                paymentMethod === "cod" ? "border-primary bg-primary/5" : "border-surface bg-surface"
              }`}
            >
              <View className="items-center">
                <Ionicons 
                  name="cash" 
                  size={24} 
                  color={paymentMethod === "cod" ? "#1DB954" : "#666"} 
                />
                <Text className={`mt-2 font-bold ${paymentMethod === "cod" ? "text-primary" : "text-text-secondary"}`}>
                  C.O.D
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <OrderSummary subtotal={subtotal} shipping={shipping} tax={tax} total={total} />
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t
       border-surface pt-4 pb-32 px-6"
      >
        {/* Quick Stats */}
        <View className="flex-row items-center justify-between mb-4">
          <View className="flex-row items-center">
            <Ionicons name="cart" size={20} color="#1DB954" />
            <Text className="text-text-secondary ml-2">
              {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-text-primary font-bold text-xl">{formatCurrency(total, currency)}</Text>
          </View>
        </View>

        {/* Checkout Button */}
        <TouchableOpacity
          className="bg-primary rounded-2xl overflow-hidden"
          activeOpacity={0.9}
          onPress={handleCheckout}
          disabled={paymentLoading}
        >
          <View className="py-5 flex-row items-center justify-center">
            {paymentLoading ? (
              <ActivityIndicator size="small" color="#121212" />
            ) : (
              <>
                <Text className="text-background font-bold text-lg mr-2">Checkout</Text>
                <Ionicons name="arrow-forward" size={20} color="#121212" />
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <AddressSelectionModal
        visible={addressModalVisible}
        onClose={() => setAddressModalVisible(false)}
        onProceed={handleProceedWithPayment}
        isProcessing={paymentLoading}
      />
    </SafeScreen>
  );
};

export default CartScreen;

function LoadingUI() {
  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator size="large" color="#00D9FF" />
      <Text className="text-text-secondary mt-4">Loading cart...</Text>
    </View>
  );
}

function ErrorUI() {
  return (
    <View className="flex-1 bg-background items-center justify-center px-6">
      <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
      <Text className="text-text-primary font-semibold text-xl mt-4">Failed to load cart</Text>
      <Text className="text-text-secondary text-center mt-2">
        Please check your connection and try again
      </Text>
    </View>
  );
}

function EmptyUI() {
  return (
    <View className="flex-1 bg-background">
      <View className="px-6 pt-16 pb-5">
        <Text className="text-text-primary text-3xl font-bold tracking-tight">Cart</Text>
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <Ionicons name="cart-outline" size={80} color="#666" />
        <Text className="text-text-primary font-semibold text-xl mt-4">Your cart is empty</Text>
        <Text className="text-text-secondary text-center mt-2">
          Add some products to get started
        </Text>
      </View>
    </View>
  );
}