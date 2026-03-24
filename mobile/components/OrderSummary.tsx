import { View, Text } from "react-native";
import { useCurrency } from "./CurrencyProvider";
import { formatCurrency } from "../lib/currencyUtils";

interface OrderSummaryProps {
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  discountAmount?: number;
  savings?: number;
}

export default function OrderSummary({ subtotal, shippingFee, totalAmount, discountAmount = 0, savings = 0 }: OrderSummaryProps) {
  return (
    <View className="px-6 mt-6">
      <View className="bg-surface rounded-3xl p-5">
        <Text className="text-text-primary text-xl font-bold mb-4">Summary</Text>

        <View className="space-y-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-text-secondary text-base">Subtotal</Text>
            <Text className="text-text-primary font-semibold text-base">
              {formatCurrency(subtotal)}
            </Text>
          </View>

          {discountAmount > 0 && (
            <View className="flex-row justify-between items-center">
              <Text className="text-green-500 text-base">Discount</Text>
              <Text className="text-green-500 font-semibold text-base">
                - {formatCurrency(discountAmount)}
              </Text>
            </View>
          )}

          <View className="flex-row justify-between items-center">
            <Text className="text-text-secondary text-base">Shipping</Text>
            <Text className="text-text-primary font-semibold text-base">
              {shippingFee === 0 ? "Free" : formatCurrency(shippingFee)}
            </Text>
          </View>

          {/* Divider */}
          <View className="border-t border-background-lighter pt-3 mt-1" />

          {/* Total */}
          <View className="flex-row justify-between items-center">
            <Text className="text-text-primary font-bold text-lg">Total</Text>
            <Text className="text-primary font-bold text-2xl">
              {formatCurrency(totalAmount)}
            </Text>
          </View>

          {/* Savings badge */}
          {savings > 0 && (
            <View className="bg-green-500/10 rounded-2xl py-2 px-4 mt-2 flex-row items-center justify-center">
              <Text className="text-green-500 font-bold text-sm">
                🎉 You saved {formatCurrency(savings)} on this order!
              </Text>
            </View>
          )}

          {/* VAT helper text */}
          <Text className="text-text-secondary/60 text-xs text-center mt-2">
            VAT included in item prices
          </Text>
        </View>
      </View>
    </View>
  );
}

