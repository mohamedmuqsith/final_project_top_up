import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { OrderDocumentData } from "@/types";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/currencyUtils";
import { useCurrency } from "@/components/CurrencyProvider";

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

interface InvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  data: OrderDocumentData | null;
}

const InvoiceModal = ({ visible, onClose, data }: InvoiceModalProps) => {
  const { currency: defaultCurrency } = useCurrency();
  const [isSharing, setIsSharing] = React.useState(false);

  if (!data) return null;

  const invoiceCurrency = data.pricing?.currency || defaultCurrency;
  const invoiceCurrencySymbol = data.pricing?.currencySymbol;

  const formatStoredCurrency = (amount: number) => formatCurrency(amount, invoiceCurrency as any, invoiceCurrencySymbol);

  const generateAndSharePDF = async () => {
    setIsSharing(true);
    try {
      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; }
              .header { display: flex; justify-content: space-between; border-bottom: 2px solid #00D9FF; padding-bottom: 20px; margin-bottom: 30px; }
              .store-name { font-size: 24px; font-weight: bold; color: #00D9FF; }
              .invoice-title { font-size: 28px; font-weight: 900; text-transform: uppercase; }
              .section-title { font-size: 14px; font-weight: bold; color: #666; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
              .item-table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
              .item-table th { text-align: left; padding: 12px; border-bottom: 2px solid #eee; font-size: 12px; color: #666; }
              .item-table td { padding: 12px; border-bottom: 1px solid #f9f9f9; font-size: 14px; }
              .totals { margin-left: auto; width: 250px; }
              .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
              .grand-total { font-size: 20px; font-weight: bold; color: #00D9FF; border-top: 2px solid #00D9FF; margin-top: 10px; padding-top: 10px; }
              .footer { text-align: center; font-size: 10px; color: #999; margin-top: 60px; padding-top: 20px; border-top: 1px dashed #eee; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <div class="store-name">${data.store.name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                  ${data.store.streetAddress}<br/>
                  ${data.store.city}, ${data.store.province} ${data.store.zipCode}<br/>
                  ${data.store.email} | ${data.store.phone}
                </div>
              </div>
              <div style="text-align: right;">
                <div class="invoice-title">Invoice</div>
                <div style="font-size: 14px; font-weight: bold;">#${data.invoiceNumber}</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">Date: ${formatDate(data.orderDate)}</div>
                ${data.shipping?.trackingNumber ? `
                  <div style="font-size: 10px; color: #888; margin-top: 3px; font-style: italic;">
                    Tracking: ${data.shipping.trackingNumber}
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="info-grid">
              <div>
                <div class="section-title">Billing To</div>
                <div style="font-weight: bold; font-size: 16px;">${data.customer.fullName}</div>
                <div style="font-size: 14px; color: #444; margin-top: 5px;">
                  ${data.customer.streetAddress}<br/>
                  ${data.customer.city}, ${data.customer.province} ${data.customer.zipCode}<br/>
                  ${data.customer.phoneNumber}
                </div>
              </div>
              <div>
                <div class="section-title">Order Status</div>
                <div style="font-weight: bold;">Logistics: <span style="text-transform: uppercase; color: #00D9FF;">${data.status}</span></div>
                <div style="font-weight: bold; margin-top: 5px;">Payment: <span style="text-transform: uppercase;">${data.payment.status}</span></div>
                ${data.payment.transactionId ? `<div style="font-size: 11px; color: #666; margin-top: 5px;">TXN: ${data.payment.transactionId}</div>` : ''}
              </div>
            </div>

            <table class="item-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Unit Price</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.items.map(item => `
                  <tr>
                    <td>${item.name}</td>
                    <td style="text-align: center;">${item.quantity}</td>
                    <td style="text-align: right;">${formatStoredCurrency(item.unitPrice)}</td>
                    <td style="text-align: right; font-weight: bold;">${formatStoredCurrency(item.subtotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span>${formatStoredCurrency(data.pricing.subtotal)}</span>
              </div>
              <div class="total-row">
                <span>Shipping Fee</span>
                <span>${data.pricing.shipping === 0 ? 'FREE' : formatStoredCurrency(data.pricing.shipping)}</span>
              </div>
              <div class="total-row">
                <span>Tax</span>
                <span>${formatStoredCurrency(data.pricing.tax)}</span>
              </div>
              <div class="total-row grand-total">
                <span>Grand Total</span>
                <span>${formatStoredCurrency(data.pricing.total)}</span>
              </div>
            </div>

            <div class="footer">
              Thank you for shopping with ${data.store.name}!<br/>
              This is a computer-generated document. No signature is required.
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Invoice_${data.invoiceNumber}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.error("PDF generation/sharing failed:", error);
    } finally {
      setIsSharing(false);
    }
  };

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
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={generateAndSharePDF}
              disabled={isSharing}
              className="bg-surface-lighter p-2 rounded-full"
            >
              {isSharing ? (
                <ActivityIndicator size="small" color="#00D9FF" />
              ) : (
                <Ionicons name="share-outline" size={22} color="#FFF" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="bg-surface-lighter p-2 rounded-full"
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
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
                      {item.quantity} × {formatStoredCurrency(item.unitPrice)}
                    </Text>
                  </View>
                  <Text className="text-text-primary font-black text-sm ml-4">
                    {formatStoredCurrency(item.subtotal)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Financial Totals */}
          <View className="bg-surface-lighter rounded-3xl p-6 mb-12 border border-white/10 shadow-lg">
            <View className="flex-row justify-between mb-3">
              <Text className="text-text-secondary text-sm">Subtotal</Text>
              <Text className="text-text-primary font-semibold text-sm">{formatStoredCurrency(data.pricing.subtotal)}</Text>
            </View>
            <View className="flex-row justify-between mb-3">
              <Text className="text-text-secondary text-sm">Shipping Fee</Text>
              <Text className="text-text-primary font-semibold text-sm">{data.pricing.shipping === 0 ? "FREE" : formatStoredCurrency(data.pricing.shipping)}</Text>
            </View>
            <View className="flex-row justify-between mb-6">
              <Text className="text-text-secondary text-sm">Applied Tax</Text>
              <Text className="text-text-primary font-semibold text-sm">{formatStoredCurrency(data.pricing.tax)}</Text>
            </View>
            <View className="flex-row justify-between pt-6 border-t border-white/10 items-center">
              <Text className="text-text-primary font-black text-xl">Grand Total</Text>
              <Text className="text-primary font-black text-2xl">{formatStoredCurrency(data.pricing.total)}</Text>
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
              {data.shipping?.trackingNumber && (
                <Text className="text-text-secondary text-[10px] mt-0.5 italic">
                  Tracking Ref: {data.shipping.trackingNumber}
                </Text>
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
