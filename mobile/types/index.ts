export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  averageRating: number;
  reviewCount: number;
  totalReviews?: number;
  originalPrice?: number;
  discountedPrice?: number;
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
  city: string;
  province: string;
  zipCode: string;
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
    city: string;
    province: string;
    zipCode: string;
    phoneNumber: string;
  };
  paymentResult: {
    id: string;
    status: string;
  };
  totalPrice: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  paymentMethod?: "online" | "cod";
  statusHistory?: {
    status: string;
    timestamp: string;
    comment?: string;
    changedBy?: string;
    source?: string;
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
    city: string;
    province: string;
    zipCode: string;
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
    shipping: number;
    tax: number;
    total: number;
  };
  payment: {
    status: string;
    transactionId: string | null;
  };
  store: {
    name: string;
    streetAddress: string;
    city: string;
    province: string;
    zipCode: string;
    email: string;
    phone: string;
  };
}