import { Offer } from "../models/offer.model.js";

// -- Admin Controllers --

export const createOffer = async (req, res) => {
  try {
    const { appliesTo, category, productId } = req.body;

    // Validation
    if (appliesTo === "category" && !category) {
      return res.status(400).json({ error: "Category is required for category-specific offers" });
    }
    if (appliesTo === "product" && !productId) {
      return res.status(400).json({ error: "Product ID is required for product-specific offers" });
    }

    // Clean up irrelevant fields
    if (appliesTo === "all") {
      req.body.category = undefined;
      req.body.productId = undefined;
    } else if (appliesTo === "category") {
      req.body.productId = undefined;
    } else if (appliesTo === "product") {
      req.body.category = undefined;
    }

    const offer = await Offer.create(req.body);
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
    const { appliesTo, category, productId } = req.body;

    // Validation
    if (appliesTo === "category" && !category) {
      return res.status(400).json({ error: "Category is required for category-specific offers" });
    }
    if (appliesTo === "product" && !productId) {
      return res.status(400).json({ error: "Product ID is required for product-specific offers" });
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
