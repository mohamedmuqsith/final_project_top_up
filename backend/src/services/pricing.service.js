import { Offer } from "../models/offer.model.js";

/**
 * Calculates the discounted price for a product based on active offers.
 * If multiple offers apply, it picks the best one for the customer.
 */
export async function getEffectivePrice(product) {
  const now = new Date();

  // Find all active offers that might apply
  const activeOffers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { appliesTo: "all" },
      { appliesTo: "product", productId: product._id },
      { appliesTo: "category", category: product.category },
    ],
  });

  if (!activeOffers || activeOffers.length === 0) {
    return {
      originalPrice: product.price,
      discountedPrice: product.price,
      appliedOffer: null,
    };
  }

  let bestDiscountedPrice = product.price;
  let bestOffer = null;

  activeOffers.forEach((offer) => {
    let currentDiscountedPrice = product.price;

    if (offer.type === "percentage") {
      currentDiscountedPrice = product.price * (1 - offer.value / 100);
    } else if (offer.type === "fixed") {
      currentDiscountedPrice = Math.max(0, product.price - offer.value);
    }

    if (currentDiscountedPrice < bestDiscountedPrice) {
      bestDiscountedPrice = currentDiscountedPrice;
      bestOffer = offer;
    }
  });

  return {
    originalPrice: product.price,
    discountedPrice: Number(bestDiscountedPrice.toFixed(2)),
    appliedOffer: bestOffer ? {
      _id: bestOffer._id,
      title: bestOffer.title,
      type: bestOffer.type,
      value: bestOffer.value,
      bannerText: bestOffer.bannerText
    } : null,
  };
}

/**
 * Enriches a list of products with their effective prices.
 */
export async function enrichProductsWithPrices(products) {
  // To avoid redundant DB calls, we can optimize this if needed, 
  // but for now, we'll process each product.
  // In a high-traffic system, we might cache active offers in memory.
  const enriched = await Promise.all(
    products.map(async (p) => {
      const pricing = await getEffectivePrice(p);
      const productObj = p.toObject ? p.toObject() : p;
      return { ...productObj, ...pricing };
    })
  );
  return enriched;
}
