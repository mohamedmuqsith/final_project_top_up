import { Settings } from "../../models/settings.model.js";

// @desc    Get store settings
// @route   GET /api/admin/settings
export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({});
    }
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in getSettings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Update store settings
// @route   PATCH /api/admin/settings
export const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    // Update fields
    const updates = req.body;
    Object.assign(settings, updates);

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in updateSettings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// @desc    Get public settings (for mobile/frontend)
// @route   GET /api/public/settings
export const getPublicSettings = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings) {
      return res.status(200).json({
        storeName: "SmartShop",
        currency: "LKR",
        currencySymbol: "Rs.",
        country: "Sri Lanka",
      });
    }

    // Only return non-sensitive info
    res.status(200).json({
      storeProfile: {
        name: settings.storeName,
        email: settings.storeEmail,
        phone: settings.storePhone,
        address: settings.storeAddress || {},
      },
      localization: {
        currency: settings.localization.currency,
        currencySymbol: settings.localization.currencySymbol,
        timezone: settings.localization.timezone || "Asia/Colombo",
      },
      shipping: {
        ...settings.shipping.toObject(),
        baseFee: settings.shipping.defaultFee,
        freeShippingThreshold: settings.shipping.freeThreshold,
      },
      tax: {
        rate: settings.tax.rate,
        enabled: settings.tax.enabled,
        label: settings.tax.label,
      },
    });
  } catch (error) {
    console.error("Error in getPublicSettings:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
