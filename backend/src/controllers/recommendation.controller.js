import { Product } from "../models/product.model.js";
import { Order } from "../models/order.model.js";
import { rankProductsWithGemini } from "../services/gemini.service.js";

// Helper to reliably map returned Gemini IDs to populated products
const mapGeminiOutputToProducts = (geminiOutput, candidates) => {
  if (!geminiOutput || !Array.isArray(geminiOutput)) return null;

  const validProducts = [];
  for (const item of geminiOutput) {
    const candidate = candidates.find((c) => c._id.toString() === item.id);
    if (candidate) {
      // Attach the AI reason to the product object before returning
      const enhancedProduct = candidate.toObject();
      enhancedProduct.recommendationReason = item.reason || "Recommended for you";
      validProducts.push(enhancedProduct);
    }
  }
  
  return validProducts.length > 0 ? validProducts : null;
};

// GET /api/recommendations/similar/:productId
export const getSimilarProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const targetProduct = await Product.findById(productId);

    if (!targetProduct) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Step 1: Database business rules to find short-list
    const candidates = await Product.find({
      _id: { $ne: targetProduct._id },
      category: targetProduct.category,
      stock: { $gt: 0 } // Must be in stock
    }).limit(15);

    // If fewer than 2 candidates, nothing clever to do
    if (candidates.length === 0) {
      return res.status(200).json({ recommendations: [] });
    }

    // Prepare context for AI
    const context = {
      name: targetProduct.name,
      category: targetProduct.category,
      price: targetProduct.price,
      description: targetProduct.description
    };

    // Step 2: Ask Gemini to rank
    const aiRanking = await rankProductsWithGemini(context, candidates, "similar");
    const enhancedRecommendations = mapGeminiOutputToProducts(aiRanking, candidates);

    // Step 3: Fallback if Gemini fails/disabled
    if (enhancedRecommendations) {
      return res.status(200).json({ recommendations: enhancedRecommendations, aiEnhanced: true });
    }

    // Fallback logic: sort by highest rating or closest price
    return res.status(200).json({
      recommendations: candidates
        .sort((a, b) => b.averageRating - a.averageRating)
        .slice(0, 5),
      aiEnhanced: false
    });

  } catch (error) {
    console.error("Error in getSimilarProducts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


// GET /api/recommendations/personalized
export const getPersonalizedRecommendations = async (req, res) => {
  try {
    const userId = req.user.clerkId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Step 1: Gather user context from recent 5 orders
    const userOrders = await Order.find({ clerkId: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("orderItems.product");

    // Extract categories user has bought recently
    const purchasedCategories = new Set(
      userOrders.flatMap(o => o.orderItems.map(item => item.product?.category))
    );
    const categoryArray = Array.from(purchasedCategories).filter(Boolean);

    let candidates = [];
    if (categoryArray.length > 0) {
      // Find in-stock items in their favourite categories (exclude what they bought if needed)
      // Exclude items currently in their most recent order to provide fresh recommendations
      const recentProductIds = userOrders[0]?.orderItems.map(i => i.product?._id.toString()) || [];
      
      candidates = await Product.find({
        category: { $in: categoryArray },
        _id: { $nin: recentProductIds },
        stock: { $gt: 0 }
      }).limit(20);
    } else {
      // Cold start: user has no orders. Recommend top rated overall.
      candidates = await Product.find({ stock: { $gt: 0 } })
        .sort({ averageRating: -1 })
        .limit(20);
    }

    if (candidates.length === 0) {
       return res.status(200).json({ recommendations: [] });
    }

    // Step 2: Use Gemini to pick best
    const context = {
      recentPurchasedCategories: categoryArray.length > 0 ? categoryArray : "New User - Unknown Preferences",
      totalOrders: userOrders.length
    };

    const aiRanking = await rankProductsWithGemini(context, candidates, "personalized");
    const enhancedRecommendations = mapGeminiOutputToProducts(aiRanking, candidates);

    // Step 3: Returns
    if (enhancedRecommendations) {
      return res.status(200).json({ recommendations: enhancedRecommendations, aiEnhanced: true });
    }

    // Fallback: top rated from DB shortlist
    return res.status(200).json({
      recommendations: candidates.sort((a, b) => b.averageRating - a.averageRating).slice(0, 5),
      aiEnhanced: false
    });

  } catch (error) {
    console.error("Error in getPersonalizedRecommendations:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/recommendations/trending
export const getTrendingProducts = async (req, res) => {
  try {
    // Stage 1: Get sales velocity for the last 14 days
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    const salesStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: fourteenDaysAgo },
          paymentStatus: "paid",
          status: { $ne: "cancelled" }
        }
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: "$orderItems.product",
          salesCount: { $sum: "$orderItems.quantity" }
        }
      },
      { $sort: { salesCount: -1 } },
      { $limit: 15 }
    ]);

    const trendingProductIds = salesStats.map(s => s._id);

    let candidates = await Product.find({
      _id: { $in: trendingProductIds },
      stock: { $gt: 0 }
    });

    // If no sales in 14 days, fallback to highest review count
    if (candidates.length < 5) {
      const fallbackCandidates = await Product.find({ stock: { $gt: 0 } })
        .sort({ reviewCount: -1, averageRating: -1 })
        .limit(10);
      
      // Merge while avoiding duplicates
      const candidateIds = new Set(candidates.map(c => c._id.toString()));
      fallbackCandidates.forEach(f => {
        if (!candidateIds.has(f._id.toString())) candidates.push(f);
      });
    }

    if (candidates.length === 0) {
      return res.status(200).json({ recommendations: [] });
    }

    // Stage 2: Gemini Reranking
    const context = { type: "trending", store: "Premium Electronics", timeframe: "Last 14 days" };
    const aiRanking = await rankProductsWithGemini(context, candidates, "trending");
    const enhancedRecommendations = mapGeminiOutputToProducts(aiRanking, candidates);

    if (enhancedRecommendations) {
      return res.status(200).json({ recommendations: enhancedRecommendations, aiEnhanced: true });
    }

    // Fallback
    return res.status(200).json({ recommendations: candidates.slice(0, 5), aiEnhanced: false });
  } catch (error) {
    console.error("Error in getTrendingProducts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/recommendations/bought-together/:productId
export const getFrequentlyBoughtTogether = async (req, res) => {
  try {
    const { productId } = req.params;

    // Logic: Find orders containing this product, then see what else was in those orders
    const ordersWithProduct = await Order.find({ "orderItems.product": productId }).limit(50);
    
    if (ordersWithProduct.length === 0) {
      // Fallback: Return similar products if no order history for this specific item
      return getSimilarProducts(req, res);
    }

    const coPurchasedIds = new Set();
    ordersWithProduct.forEach(order => {
      order.orderItems.forEach(item => {
        if (item.product.toString() !== productId) {
          coPurchasedIds.add(item.product.toString());
        }
      });
    });

    const candidates = await Product.find({
      _id: { $in: Array.from(coPurchasedIds) },
      stock: { $gt: 0 }
    }).limit(10);

    if (candidates.length === 0) {
      return getSimilarProducts(req, res);
    }

    // Stage 2: Gemini Reranking for complimentary items
    const target = await Product.findById(productId);
    const context = { target: target.name, category: target.category };
    const aiRanking = await rankProductsWithGemini(context, candidates, "similar");
    const enhancedRecommendations = mapGeminiOutputToProducts(aiRanking, candidates);

    if (enhancedRecommendations) {
      // Deduplicate: filter out product itself again just in case AI returned it
      const final = enhancedRecommendations.filter(p => p._id.toString() !== productId);
      return res.status(200).json({ recommendations: final.slice(0, 5), aiEnhanced: true });
    }

    const finalFallback = candidates
      .filter(p => p._id.toString() !== productId)
      .slice(0, 5);

    return res.status(200).json({ recommendations: finalFallback, aiEnhanced: false });
  } catch (error) {
    console.error("Error in getFrequentlyBoughtTogether:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
