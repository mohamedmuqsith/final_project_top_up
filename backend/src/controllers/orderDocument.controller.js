import { Order } from "../models/order.model.js";

// Store info used across all documents
const STORE_INFO = {
  name: "SmartShop Electronics",
  streetAddress: "100 Innovation Drive",
  city: "San Francisco",
  province: "CA",
  zipCode: "94105",
  email: "orders@smartshop.com",
  phone: "+1 (800) 555-0199",
};

// Server-side status validation per document type
const DOC_STATUS_RULES = {
  invoice: ["pending", "processing", "shipped", "delivered"],
  "packing-slip": ["processing", "shipped"],
  "shipping-label": ["processing", "shipped"],
};

/**
 * GET /api/admin/orders/:id/document-data?docType=invoice|packing-slip|shipping-label
 * Returns enriched order data for client-side document generation.
 * Enforces status-based access rules server-side.
 */
export async function getOrderDocumentData(req, res) {
  try {
    const user = req.user;
    const { docType } = req.query;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Authorization: Admin OR Order Owner (Clerk ID must match)
    const isOwner = user.clerkId === order.clerkId;
    const isAdmin = user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: "Unauthorized: You do not have permission to access these documents" });
    }

    // Populate products for invoice/packing slip details
    await order.populate("orderItems.product", "name price category");

    // Validate docType + status combination
    if (docType && DOC_STATUS_RULES[docType]) {
      const allowedStatuses = DOC_STATUS_RULES[docType];
      if (!allowedStatuses.includes(order.status)) {
        return res.status(400).json({
          error: `Cannot generate ${docType} for an order with status: ${order.status}`,
        });
      }
    }

    const shortId = order._id.toString().slice(-8).toUpperCase();

    const documentData = {
      orderId: order._id,
      orderShortId: shortId,
      invoiceNumber: `INV-${shortId}`,
      orderDate: order.createdAt,
      shippedAt: order.shippedAt || null,
      deliveredAt: order.deliveredAt || null,
      status: order.status,

      customer: {
        fullName: order.shippingAddress.fullName,
        streetAddress: order.shippingAddress.streetAddress,
        city: order.shippingAddress.city,
        province: order.shippingAddress.province,
        zipCode: order.shippingAddress.zipCode,
        phoneNumber: order.shippingAddress.phoneNumber,
      },

      items: order.orderItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        subtotal: item.price * item.quantity,
        image: item.image,
        productId: item.product?._id || null,
      })),

      pricing: {
        subtotal: order.pricing?.subtotal || order.totalPrice,
        shipping: order.pricing?.shippingFee || 0,
        tax: order.pricing?.tax || 0,
        total: order.pricing?.total || order.totalPrice,
      },

      payment: {
        method: order.paymentMethod || "online",
        status: order.paymentStatus || order.paymentResult?.status || "pending",
        transactionId: order.paymentResult?.id || null,
      },

      store: STORE_INFO,
    };

    res.status(200).json(documentData);
  } catch (error) {
    console.error("Error in getOrderDocumentData:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
