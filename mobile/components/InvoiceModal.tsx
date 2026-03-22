import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { OrderDocumentData } from "@/types";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currencyUtils";
import { useCurrency } from "@/components/CurrencyProvider";

interface InvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  data: OrderDocumentData | null;
}

const InvoiceModal = ({ visible, onClose, data }: InvoiceModalProps) => {
  const { currency } = useCurrency();

  if (!data) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
          <View className="flex-row items-center">
            <View className="bg-primary/20 p-2 rounded-xl mr-3">
              <Ionicons name="document-text" size={20} color="#00D9FF" />
            </View>
            <Text className="text-text-primary font-black text-xl">Digital Invoice</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            className="bg-surface-lighter p-2 rounded-full"
          >
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-6 pt-6">
          {/* Store Info */}
          <View className="mb-8">
            <Text className="text-primary font-black text-2xl mb-1">{data.store.name}</Text>
            <Text className="text-text-secondary text-sm leading-5">
              {data.store.streetAddress},{"\n"}
              {data.store.city}, {data.store.province} {data.store.zipCode}
            </Text>
            <View className="flex-row mt-2 gap-4">
              <View className="flex-row items-center">
                <Ionicons name="mail-outline" size={14} color="#666" />
                <Text className="text-text-secondary text-xs ml-1">{data.store.email}</Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="call-outline" size={14} color="#666" />
                <Text className="text-text-secondary text-xs ml-1">{data.store.phone}</Text>
              </View>
            </View>
          </View>

          {/* Invoice Metadata */}
          <View className="bg-surface rounded-3xl p-5 mb-8 border border-white/5 shadow-xl shadow-black/20">
            <View className="flex-row justify-between mb-4">
              <View>
                <Text className="text-text-secondary text-[10px] uppercase font-bold tracking-widest mb-1">Invoice Number</Text>
                <Text className="text-text-primary font-bold text-base">{data.invoiceNumber}</Text>
              </View>
              <View className="items-end">
                <Text className="text-text-secondary text-[10px] uppercase font-bold tracking-widest mb-1">Order Date</Text>
                <Text className="text-text-primary font-bold text-base">{formatDate(data.orderDate)}</Text>
              </View>
            </View>
            <View className="flex-row justify-between pt-4 border-t border-white/5">
              <View>
                <Text className="text-text-secondary text-[10px] uppercase font-bold tracking-widest mb-1">Status</Text>
                <View className="bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  <Text className="text-primary font-bold text-[10px] uppercase">{data.status}</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-text-secondary text-[10px] uppercase font-bold tracking-widest mb-1">Payment</Text>
                <Text className="text-text-primary font-bold text-sm uppercase">{data.payment.status}</Text>
              </View>
            </View>
          </View>

          {/* Customer Info */}
          <View className="mb-8 px-1">
            <View className="flex-row items-center mb-4">
              <Ionicons name="person-outline" size={16} color="#00D9FF" />
              <Text className="text-text-primary font-bold text-base ml-2">Bill To</Text>
            </View>
            <Text className="text-text-primary font-bold text-lg mb-1">{data.customer.fullName}</Text>
            <Text className="text-text-secondary text-sm leading-5">
              {data.customer.streetAddress},{"\n"}
              {data.customer.city}, {data.customer.province} {data.customer.zipCode}
            </Text>
            <Text className="text-text-secondary text-xs mt-2 italic">{data.customer.phoneNumber}</Text>
          </View>

          {/* Items Table */}
          <View className="mb-10">
            <View className="flex-row items-center mb-4">
              <Ionicons name="list-outline" size={18} color="#00D9FF" />
              <Text className="text-text-primary font-bold text-base ml-2">Purchase Summary</Text>
            </View>

            <View className="space-y-4">
              {data.items.map((item, index) => (
                <View key={index} className="flex-row items-center bg-surface-lighter/30 p-3 rounded-2xl border border-white/5">
                  <Image
                    source={item.image}
                    style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: "#1e1e1e" }}
                  />
                  <View className="flex-1 ml-4 justify-center">
                    <Text className="text-text-primary font-bold text-sm truncate" numberOfLines={1}>{item.name}</Text>
                    <Text className="text-text-secondary text-xs mt-0.5">
                      {item.quantity} × {formatCurrency(item.unitPrice, currency)}
                    </Text>
                  </View>
                  <Text className="text-text-primary font-black text-sm ml-4">
                    {formatCurrency(item.subtotal, currency)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Financial Totals */}
          <View className="bg-surface-lighter rounded-3xl p-6 mb-12 border border-white/10 shadow-lg">
            <View className="flex-row justify-between mb-3">
              <Text className="text-text-secondary text-sm">Subtotal</Text>
              <Text className="text-text-primary font-semibold text-sm">{formatCurrency(data.pricing.subtotal, currency)}</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-text-secondary text-sm">Shipping Fee</Text>
              <Text className="text-text-primary font-semibold text-sm">{data.pricing.shipping === 0 ? "FREE" : formatCurrency(data.pricing.shipping, currency)}</Text>
            </View>
            <View className="flex-row justify-between mb-6">
              <Text className="text-text-secondary text-sm">Applied Tax</Text>
              <Text className="text-text-primary font-semibold text-sm">{formatCurrency(data.pricing.tax, currency)}</Text>
            </View>
            <View className="flex-row justify-between pt-6 border-t border-white/10 items-center">
              <Text className="text-text-primary font-black text-xl">Grand Total</Text>
              <Text className="text-primary font-black text-2xl">{formatCurrency(data.pricing.total, currency)}</Text>
            </View>
          </View>

          {/* Payment & Transaction Info */}
          <View className="items-center mb-16 opacity-60">
            <View className="bg-surface p-4 rounded-3xl w-full border border-dashed border-white/20 items-center">
              <View className="flex-row items-center gap-2 mb-1">
                <Ionicons name="shield-checkmark-outline" size={14} color="#666" />
                <Text className="text-text-secondary text-xs font-bold uppercase tracking-tight">Payment Verified</Text>
              </View>
              {data.payment.transactionId && (
                <Text className="text-text-secondary text-[10px]">TXN ID: {data.payment.transactionId}</Text>
              )}
              <Text className="text-text-secondary text-[10px] mt-4 text-center">
                This receipt is system-generated and proof of purchase for the contents listed above.
                Thank you for shopping with {data.store.name}!
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default InvoiceModal;
