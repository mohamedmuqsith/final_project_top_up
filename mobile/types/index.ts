export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: { url: string; publicId: string }[];
  averageRating: number;
  reviewCount: number;
  totalReviews?: number;
  originalPrice?: number;
  discountedPrice?: number;
  hasActiveOffer?: boolean;
  savingsAmount?: number;
  savingsPercentage?: number;
  offerLabel?: string | null;
  offerScope?: string | null;
  appliedOffer?: {
    _id: string;
    title: string;
    type: string;
    value: number;
    bannerText?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  _id: string;
  clerkId: string;
  email: string;
  name: string;
  imageUrl: string;
  addresses: Address[];
  wishlist: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  _id: string;
  label: string;
  fullName: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  district?: string;
  province: string;
  postalCode: string;
  zipCode?: string; // Backward compatibility
  phoneNumber: string;
  isDefault: boolean;
}

export interface Order {
  _id: string;
  user: string;
  clerkId: string;
  orderItems: OrderItem[];
  shippingAddress: {
    fullName: string;
    streetAddress: string;
    addressLine2?: string;
    city: string;
    district?: string;
    province: string;
    postalCode: string;
    zipCode?: string;
    phoneNumber: string;
  };
  paymentResult?: {
    id: string;
    status: string;
    update_time?: string;
    email_address?: string;
  };
  pricing?: {
    subtotal: number;
    originalSubtotal?: number;
    discountAmount?: number;
    shippingFee: number;
    taxAmount: number;
    discount?: number;
    total: number; // standardized
    totalAmount?: number; // legacy
    currency: string;
    currencySymbol?: string;
    extractedVat?: number;
    taxIncluded?: boolean;
    vatRate?: number;
    savings?: number;
    appliedCoupon?: {
      code: string;
      title: string;
      discountType: string;
      value: number;
      discountGiven: number;
    } | null;
    appliedOffers?: {
      offerId: string;
      title: string;
      type: string;
      value: number;
      scope: string;
    }[];
  };
  shippingDetails?: {
    method: string;
    courierName?: string;
    trackingNumber?: string; // Courier tracking
    internalTrackingNumber?: string; // App-generated tracking
    trackingUrl?: string;
    estimatedDeliveryDate?: string;
    shippedAt?: string;
    deliveredAt?: string;
  };
  delivery?: {
    method: string;
    courier?: string;
    trackingNumber?: string;
    estimatedDeliveryDate?: string;
  };
  totalPrice: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: "online" | "cod";
  statusHistory: {
    status: string;
    timestamp: string;
    comment?: string;
    changedBy?: string;
    changedByType?: "system" | "admin" | "customer" | "worker";
  }[];
  returnStatus?: "none" | "requested" | "approved" | "refunded" | "denied";
  returnReason?: string;
  returnNotes?: string;
  hasReviewed: boolean;
  shippedAt?: string;
  deliveredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  _id: string;
  product: Product;
  name: string;
  price: number;
  quantity: number;
  image: string;
  hasReviewed?: boolean;
  reviewId?: string;
}

export interface Review {
  _id: string;
  productId: string;
  userId: string | User;
  orderId: string;
  rating: number;
  comment?: string;
  title?: string;
  status: "published" | "hidden" | "flagged";
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  _id: string;
  product: Product;
  quantity: number;
}

export interface Cart {
  _id: string;
  user: string;
  clerkId: string;
  items: CartItem[];
  pricing?: {
    subtotal: number;
    originalSubtotal?: number;
    discountAmount?: number;
    shippingFee: number;
    taxAmount: number;
    discount?: number;
    total: number;
    totalAmount?: number;
    currency: string;
    currencySymbol: string;
    extractedVat?: number;
    taxIncluded?: boolean;
    vatRate?: number;
    savings?: number;
    appliedCoupon?: {
      code: string;
      title: string;
      discountType: string;
      value: number;
      discountGiven: number;
    } | null;
    appliedOffers?: {
      offerId: string;
      title: string;
      type: string;
      value: number;
      scope: string;
    }[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderDocumentData {
  orderId: string;
  orderShortId: string;
  invoiceNumber: string;
  orderDate: string;
  shippedAt?: string;
  deliveredAt?: string;
  status: string;
  customer: {
    fullName: string;
    streetAddress: string;
    addressLine2?: string;
    city: string;
    district?: string;
    province: string;
    postalCode: string;
    zipCode?: string;
    phoneNumber: string;
  };
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    image: string;
    productId: string | null;
  }[];
  pricing: {
    subtotal: number;
    originalSubtotal?: number;
    discountAmount?: number;
    shippingFee: number;
    taxAmount: number;
    discount?: number;
    total: number;
    totalAmount: number;
    currency?: string;
    currencySymbol?: string;
    extractedVat?: number;
    taxIncluded?: boolean;
    vatRate?: number;
    savings?: number;
    appliedCoupon?: {
      code: string;
      title: string;
      discountType: string;
      value: number;
      discountGiven: number;
    } | null;
  };
  payment: {
    status: string;
    transactionId: string | null;
  };
  shipping: {
    method: string;
    courier: string | null;
    trackingNumber: string | null;
    estimatedDelivery: string | null;
  };
  store: {
    name: string;
    streetAddress: string;
    addressLine2?: string;
    city: string;
    district?: string;
    province: string;
    postalCode: string;
    zipCode?: string;
    email: string;
    phone: string;
    vatNumber?: string;
  };
}