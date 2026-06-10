import {
  getUpsellRevenue,
  getUpsellItemCount,
  getUpsellConversionRate,
  getTopUpsellPairings,
} from "./orderController.js";

export const getRestaurantAnalytics = async (req, res) => {
  try {
    const { restaurantId, limit } = req.query;
    const lim = parseInt(limit, 10) || 10;

    // Compute metrics (helpers accept undefined/null for all-restaurants)
    const [upsellRevenue, upsellItemCount, upsellConversionRate, topPairings] =
      await Promise.all([
        getUpsellRevenue(restaurantId),
        getUpsellItemCount(restaurantId),
        getUpsellConversionRate(restaurantId),
        getTopUpsellPairings(restaurantId, lim),
      ]);

    return res.json({
      restaurantId: restaurantId || null,
      upsellRevenue,
      upsellItemCount,
      upsellConversionRate,
      topPairings,
    });
  } catch (err) {
    console.error("getRestaurantAnalytics error:", err);
    return res.status(500).json({ message: "Failed to compute analytics" });
  }
};
