import { Offer } from "../models/offer.model.js";

/**
 * Calculates the discounted price for a product based on active offers.
 * Implements precedence: Product-specific > Category-specific > Store-wide.
 * If multiple offers exist at the same level, it picks the best one.
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
      hasActiveOffer: false,
      originalPrice: product.price,
      discountedPrice: product.price,
      savingsAmount: 0,
      savingsPercentage: 0,
      offerLabel: null,
      offerScope: null,
      appliedOffer: null,
    };
  }

  // Precedence buckets
  const productOffers = activeOffers.filter(o => o.appliesTo === "product");
  const categoryOffers = activeOffers.filter(o => o.appliesTo === "category");
  const allOffers = activeOffers.filter(o => o.appliesTo === "all");

  // Determine the winning pool based on precedence: Product > Category > All
  let winningPool = [];
  let scope = null;

  if (productOffers.length > 0) {
    winningPool = productOffers;
    scope = "product";
  } else if (categoryOffers.length > 0) {
    winningPool = categoryOffers;
    scope = "category";
  } else {
    winningPool = allOffers;
    scope = "all";
  }

  let bestDiscountedPrice = product.price;
  let bestOffer = null;

  winningPool.forEach((offer) => {
    let currentDiscountedPrice = product.price;

    if (offer.type === "percentage") {
      currentDiscountedPrice = product.price * (1 - offer.value / 100);
    } else if (offer.type === "fixed") {
      currentDiscountedPrice = Math.max(0, product.price - offer.value);
    }

    // Pick the best discount within the same precedence level
    if (currentDiscountedPrice < bestDiscountedPrice) {
      bestDiscountedPrice = currentDiscountedPrice;
      bestOffer = offer;
    }
  });

  const finalPrice = Number(bestDiscountedPrice.toFixed(2));
  const savingsAmount = Number((product.price - finalPrice).toFixed(2));
  const savingsPercentage = product.price > 0 ? Math.round((savingsAmount / product.price) * 100) : 0;

  return {
    hasActiveOffer: !!bestOffer,
    originalPrice: product.price,
    discountedPrice: finalPrice,
    savingsAmount,
    savingsPercentage,
    offerLabel: bestOffer?.bannerText || bestOffer?.title || null,
    offerScope: scope,
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
