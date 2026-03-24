import { Offer } from "../models/offer.model.js";
import { Product } from "../models/product.model.js";
import { Settings } from "../models/settings.model.js";

/**
 * Calculates the discounted price for a product based on active offers.
 * Implements precedence: Product-specific > Category-specific > Store-wide.
 * If multiple offers exist at the same level, it picks the best one.
 */
export async function getEffectivePrice(product) {
  const now = new Date();

  // Find all active offers that might apply (EXCLUDE those with coupon codes)
  const activeOffers = await Offer.find({
    isActive: true,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $and: [
      {
        $or: [
          { appliesTo: "all" },
          { appliesTo: "product", productId: product._id },
          { appliesTo: "category", category: product.category },
        ]
      },
      {
        $or: [
          { couponCode: { $exists: false } },
          { couponCode: null },
          { couponCode: "" }
        ]
      }
    ]
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

/**
 * Validates cart items, checks stock, and calculates pricing details.
 * Used by order creation and document generation flows.
 * 
 * @param {Array} cartItems - Cart items with product references
 * @param {boolean} lenient - If true, skip stock validation (for cart preview)
 * @param {string|null} couponCode - Optional coupon code to apply
 */
export async function validateCartItems(cartItems, lenient = false, couponCode = null) {
  if (!cartItems || cartItems.length === 0) {
    if (lenient) return { 
      subtotal: 0, originalSubtotal: 0, discountAmount: 0, savings: 0,
      shippingFee: 0, total: 0, validatedItems: [],
      taxIncluded: true, currency: "LKR", currencySymbol: "Rs."
    };
    throw new Error("Cart is empty");
  }

  let subtotal = 0;         // After product-level discounts
  let originalSubtotal = 0; // Before any discounts
  let totalSavings = 0;     // Total saved from product-level offers
  const validatedItems = [];
  const appliedOffers = [];
  const seenOfferIds = new Set();

  for (const item of cartItems) {
    const productId = item?.product?._id || item?.product;
    if (!productId) {
      throw new Error("Invalid cart item: missing product");
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Stock check
    if (product.stock < item.quantity && !lenient) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    // SERVER-SIDE PRICING: calculate effective price with offer
    const pricing = await getEffectivePrice(product);
    const effectivePrice = pricing.discountedPrice;
    const itemOriginalTotal = product.price * item.quantity;
    const itemDiscountedTotal = effectivePrice * item.quantity;
    const itemSavings = itemOriginalTotal - itemDiscountedTotal;

    originalSubtotal += itemOriginalTotal;
    subtotal += itemDiscountedTotal;
    totalSavings += itemSavings;

    // Track applied offer metadata (deduplicated)
    if (pricing.appliedOffer && !seenOfferIds.has(pricing.appliedOffer._id.toString())) {
      seenOfferIds.add(pricing.appliedOffer._id.toString());
      appliedOffers.push({
        offerId: pricing.appliedOffer._id,
        title: pricing.appliedOffer.title,
        type: pricing.appliedOffer.type,
        value: pricing.appliedOffer.value,
        scope: pricing.offerScope,
      });
    }

    validatedItems.push({
      product: product._id.toString(),
      name: product.name,
      price: effectivePrice,
      quantity: item.quantity,
      image: (typeof product.images?.[0] === "string" ? product.images[0] : product.images?.[0]?.url) || "/placeholder.jpg",
    });
  }

  // --- Coupon / Voucher validation ---
  let appliedCoupon = null;
  let couponDiscount = 0;

  if (couponCode) {
    const now = new Date();
    const coupon = await Offer.findOne({
      couponCode: couponCode.toUpperCase().trim(),
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (coupon) {
      if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
        if (!coupon.minOrderAmount || subtotal >= coupon.minOrderAmount) {
          // Calculate coupon discount on the already-discounted subtotal
          if (coupon.type === "percentage") {
            couponDiscount = subtotal * (coupon.value / 100);
            if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
              couponDiscount = coupon.maxDiscount;
            }
          } else if (coupon.type === "fixed") {
            couponDiscount = Math.min(coupon.value, subtotal);
          }

          couponDiscount = Number(couponDiscount.toFixed(2));
          subtotal = Math.max(0, subtotal - couponDiscount);
          totalSavings += couponDiscount;

          appliedCoupon = {
            code: coupon.couponCode,
            title: coupon.title,
            discountType: coupon.type,
            value: coupon.value,
            discountGiven: couponDiscount,
            offerId: coupon._id,
          };
        }
      }
    }
  }

  // Handle errors gracefully without throwing if lenient mode is on for coupon only
  let couponError = null;
  if (couponCode && !appliedCoupon) {
     // We need to find WHY it failed to give a good message
     const now = new Date();
     const rawCoupon = await Offer.findOne({ couponCode: couponCode.toUpperCase().trim() });
     
     if (!rawCoupon) {
       couponError = "Invalid coupon code";
     } else if (!rawCoupon.isActive || rawCoupon.startDate > now || rawCoupon.endDate < now) {
       couponError = "This coupon has expired or is not yet active";
     } else if (rawCoupon.usageLimit && rawCoupon.usedCount >= rawCoupon.usageLimit) {
       couponError = "This coupon has reached its usage limit";
     } else if (rawCoupon.minOrderAmount && subtotal < rawCoupon.minOrderAmount) {
       couponError = `Minimum order of Rs. ${rawCoupon.minOrderAmount.toFixed(0)} required`;
     } else {
       couponError = "Coupon could not be applied to these items";
     }
  }

  // --- Shipping ---
  const settings = await Settings.findOne();
  const shippingConfig = settings?.shipping || { defaultFee: 350, freeThreshold: 5000 };
  const taxConfig = settings?.tax || { rate: 15, enabled: true };

  let shippingFee = shippingConfig.defaultFee;
  if (subtotal >= shippingConfig.freeThreshold) {
    shippingFee = 0;
  }

  // --- VAT extraction (prices are already VAT-inclusive) ---
  const vatRate = taxConfig.rate || 15;
  const extractedVat = subtotal * (vatRate / (100 + vatRate));
  const netAmount = subtotal - extractedVat;

  // --- Final total ---
  const discountAmount = Number((originalSubtotal - subtotal).toFixed(2));
  const total = Number((subtotal + shippingFee).toFixed(2));

  if (total < 0) {
    throw new Error("Invalid order total");
  }

  console.log(`[PricingService] Calculation for ${cartItems.length} items:`, {
    originalSubtotal, subtotal, discountAmount, shippingFee, total, savings: totalSavings, couponError
  });

  return { 
    validatedItems, 
    subtotal: Number(subtotal.toFixed(2)),
    originalSubtotal: Number(originalSubtotal.toFixed(2)),
    discountAmount,
    discount: discountAmount, // Legacy compatibility
    shippingFee, 
    total,
    totalAmount: total, // Legacy compatibility
    savings: Number(totalSavings.toFixed(2)),
    netAmount: Number(netAmount.toFixed(2)),
    vatRate,
    extractedVat: Number(extractedVat.toFixed(2)),
    taxIncluded: true,
    currency: "LKR",
    currencySymbol: "Rs.",
    appliedOffers,
    appliedCoupon,
    couponError,
  };
}

