import { View, Text } from "react-native";
import { useCurrency } from "./CurrencyProvider";
import { formatCurrency } from "../lib/currencyUtils";

interface OrderSummaryProps {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
}

export default function OrderSummary({ subtotal, shipping, tax, total }: OrderSummaryProps) {
  const { currency } = useCurrency();

  return (
    <View className="px-6 mt-6">
      <View className="bg-surface rounded-3xl p-5">
        <Text className="text-text-primary text-xl font-bold mb-4">Summary</Text>

        <View className="space-y-3">
          <View className="flex-row justify-between items-center">
            <Text className="text-text-secondary text-base">Subtotal</Text>
            <Text className="text-text-primary font-semibold text-base">
              {formatCurrency(subtotal, currency)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-text-secondary text-base">Shipping</Text>
            <Text className="text-text-primary font-semibold text-base">
              {formatCurrency(shipping, currency)}
            </Text>
          </View>

          <View className="flex-row justify-between items-center">
            <Text className="text-text-secondary text-base">Tax</Text>
            <Text className="text-text-primary font-semibold text-base">
              {formatCurrency(tax, currency)}
            </Text>
          </View>

          {/* Divider */}
          <View className="border-t border-background-lighter pt-3 mt-1" />

          {/* Total */}
          <View className="flex-row justify-between items-center">
            <Text className="text-text-primary font-bold text-lg">Total</Text>
            <Text className="text-primary font-bold text-2xl">
              {formatCurrency(total, currency)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
