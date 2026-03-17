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
  invoice: ["processing", "shipped", "delivered"],
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
    const { docType } = req.query;

    const order = await Order.findById(req.params.id).populate(
      "orderItems.product",
      "name price"
    );

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Validate docType + status combination if docType is provided
    if (docType && DOC_STATUS_RULES[docType]) {
      const allowedStatuses = DOC_STATUS_RULES[docType];
      if (!allowedStatuses.includes(order.status)) {
        return res.status(403).json({
          error: `Cannot generate ${docType} for an order with status "${order.status}"`,
        });
      }
    }

    const shortId = order._id.toString().slice(-8).toUpperCase();

    // Calculate subtotal from line items
    const subtotal = order.orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

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
        subtotal,
        shipping: 0, // Not tracked separately in the current model
        tax: 0, // Not tracked separately in the current model
        total: order.totalPrice,
      },

      payment: {
        status: order.paymentResult?.status || "unknown",
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

