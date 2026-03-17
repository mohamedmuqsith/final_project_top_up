import { Product } from "../models/product.model.js";
import { getEffectivePrice } from "../services/pricing.service.js";

export async function getProductById(req, res) {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) return res.status(404).json({ error: "Product not found" });

    const pricing = await getEffectivePrice(product);
    res.status(200).json({ ...product.toObject(), ...pricing });
  } catch (error) {
    console.error("Error fetching product:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}