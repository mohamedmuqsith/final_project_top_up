import { Offer } from "../models/offer.model.js";

// -- Admin Controllers --

export const createOffer = async (req, res) => {
  try {
    const { title, type, value, appliesTo, category, productId, startDate, endDate,
            couponCode, minOrderAmount, maxDiscount, usageLimit } = req.body;

    // Basic required fields
    if (!title || !type || value === undefined || !appliesTo || !startDate || !endDate) {
      return res.status(400).json({ error: "All required fields must be provided" });
    }

    // Date validation
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return res.status(400).json({ error: "End date must be after start date" });
    }

    // Value validation
    if (value < 0) {
      return res.status(400).json({ error: "Discount value cannot be negative" });
    }
    if (type === "percentage" && value > 100) {
      return res.status(400).json({ error: "Percentage discount cannot exceed 100%" });
    }

    // Target validation
    if (appliesTo === "category" && !category) {
      return res.status(400).json({ error: "Category is required for category-specific offers" });
    }
    if (appliesTo === "product" && !productId) {
      return res.status(400).json({ error: "Product ID is required for product-specific offers" });
    }

    // Coupon code uniqueness check
    if (couponCode) {
      const existing = await Offer.findOne({ couponCode: couponCode.toUpperCase().trim() });
      if (existing) {
        return res.status(400).json({ error: "This coupon code is already in use" });
      }
    }

    // Clean up irrelevant fields
    const newOfferData = { ...req.body };
    if (appliesTo === "all") {
      newOfferData.category = undefined;
      newOfferData.productId = undefined;
    } else if (appliesTo === "category") {
      newOfferData.productId = undefined;
    } else if (appliesTo === "product") {
      newOfferData.category = undefined;
    }

    // Normalize coupon code
    if (newOfferData.couponCode) {
      newOfferData.couponCode = newOfferData.couponCode.toUpperCase().trim();
    }

    const offer = await Offer.create(newOfferData);
    res.status(201).json({ message: "Offer created successfully", offer });
  } catch (error) {
    console.error("Error in createOffer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getOffers = async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { couponCode: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") {
      const now = new Date();
      query.isActive = true;
      query.startDate = { $lte: now };
      query.endDate = { $gte: now };
    } else if (status === "inactive") {
      query.isActive = false;
    } else if (status === "expired") {
      query.endDate = { $lt: new Date() };
    }

    const offers = await Offer.find(query).sort({ createdAt: -1 });
    res.status(200).json({ offers });
  } catch (error) {
    console.error("Error in getOffers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, value, appliesTo, category, productId, startDate, endDate,
            couponCode } = req.body;

    // Basic validation if fields are provided
    if (endDate && startDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        return res.status(400).json({ error: "End date must be after start date" });
      }
    }

    if (value !== undefined && value < 0) {
      return res.status(400).json({ error: "Discount value cannot be negative" });
    }
    if (type === "percentage" && value > 100) {
      return res.status(400).json({ error: "Percentage discount cannot exceed 100%" });
    }

    // Target validation
    if (appliesTo === "category" && !category) {
      return res.status(400).json({ error: "Category is required for category-specific offers" });
    }
    if (appliesTo === "product" && !productId) {
      return res.status(400).json({ error: "Product ID is required for product-specific offers" });
    }

    // Coupon code uniqueness check (exclude self)
    if (couponCode) {
      const existing = await Offer.findOne({ 
        couponCode: couponCode.toUpperCase().trim(),
        _id: { $ne: id }
      });
      if (existing) {
        return res.status(400).json({ error: "This coupon code is already in use" });
      }
    }

    // Clean up irrelevant fields
    const updateData = { ...req.body };
    if (appliesTo === "all") {
      updateData.category = null;
      updateData.productId = null;
    } else if (appliesTo === "category") {
      updateData.productId = null;
    } else if (appliesTo === "product") {
      updateData.category = null;
    }

    // Normalize coupon code
    if (updateData.couponCode) {
      updateData.couponCode = updateData.couponCode.toUpperCase().trim();
    }

    const offer = await Offer.findByIdAndUpdate(id, updateData, { new: true });
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    res.status(200).json({ message: "Offer updated successfully", offer });
  } catch (error) {
    console.error("Error in updateOffer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const offer = await Offer.findByIdAndDelete(id);
    if (!offer) return res.status(404).json({ error: "Offer not found" });
    res.status(200).json({ message: "Offer deleted successfully" });
  } catch (error) {
    console.error("Error in deleteOffer:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// -- Customer Controllers --

export const getActiveOffers = async (req, res) => {
  try {
    const now = new Date();
    const offers = await Offer.find({
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    }).sort({ createdAt: -1 });
    res.status(200).json({ offers });
  } catch (error) {
    console.error("Error in getActiveOffers:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Validate a coupon code against the current cart subtotal.
 * POST /api/offers/validate-coupon
 * Body: { code: string, subtotal: number }
 */
export const validateCoupon = async (req, res) => {
  try {
    const { code, subtotal = 0 } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Coupon code is required" });
    }

    const now = new Date();
    const coupon = await Offer.findOne({
      couponCode: code.toUpperCase().trim(),
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!coupon) {
      return res.status(404).json({ error: "Invalid or expired coupon code" });
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ error: "This coupon has reached its usage limit" });
    }

    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      return res.status(400).json({ 
        error: `Minimum order amount of Rs. ${coupon.minOrderAmount.toFixed(2)} required`,
        minOrderAmount: coupon.minOrderAmount
      });
    }

    // Calculate estimated discount
    let estimatedDiscount = 0;
    if (coupon.type === "percentage") {
      estimatedDiscount = subtotal * (coupon.value / 100);
      if (coupon.maxDiscount && estimatedDiscount > coupon.maxDiscount) {
        estimatedDiscount = coupon.maxDiscount;
      }
    } else {
      estimatedDiscount = Math.min(coupon.value, subtotal);
    }

    res.status(200).json({
      valid: true,
      coupon: {
        code: coupon.couponCode,
        title: coupon.title,
        type: coupon.type,
        value: coupon.value,
        maxDiscount: coupon.maxDiscount,
        minOrderAmount: coupon.minOrderAmount,
      },
      estimatedDiscount: Number(estimatedDiscount.toFixed(2)),
    });
  } catch (error) {
    console.error("Error in validateCoupon:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

