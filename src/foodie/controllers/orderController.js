import Order from "../models/orderModel.js";

export const createOrder = async (req, res) => {
  try {
    const { restaurantId, sessionId, items, totalAmount } = req.body;

    if (
      !restaurantId ||
      !sessionId ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({ message: "Invalid order payload" });
    }

    for (const it of items) {
      if (!it.itemId || typeof it.price === "undefined") {
        return res.status(400).json({ message: "Invalid order item" });
      }
      // Default missing/invalid `addedVia` to 'chat' for backwards compatibility
      if (!it.addedVia || !["chat", "upsell"].includes(it.addedVia)) {
        it.addedVia = "chat";
      }
      // `sourceItemId` is optional for now; only validate `addedVia` implicitly via defaulting.
    }

    const order = new Order({ restaurantId, sessionId, items, totalAmount });
    await order.save();

    return res.status(201).json(order);
  } catch (error) {
    console.error("createOrder error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// Analytics helpers (not exposed as public API by default)
export const getUpsellRevenue = async (restaurantId) => {
  const match = restaurantId ? { restaurantId } : {};
  const pipeline = [
    { $match: match },
    { $unwind: "$items" },
    { $match: { "items.addedVia": "upsell" } },
    {
      $group: {
        _id: null,
        total: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
      },
    },
  ];
  const res = await Order.aggregate(pipeline);
  return res[0]?.total || 0;
};

export const getUpsellItemCount = async (restaurantId) => {
  const match = restaurantId ? { restaurantId } : {};
  const pipeline = [
    { $match: match },
    { $unwind: "$items" },
    { $match: { "items.addedVia": "upsell" } },
    { $group: { _id: null, count: { $sum: "$items.quantity" } } },
  ];
  const res = await Order.aggregate(pipeline);
  return res[0]?.count || 0;
};

export const getUpsellConversionRate = async (restaurantId) => {
  const match = restaurantId ? { restaurantId } : {};

  const totalOrdersPipeline = [{ $match: match }, { $count: "total" }];
  const upsellOrdersPipeline = [
    { $match: match },
    { $match: { "items.addedVia": "upsell" } },
    { $group: { _id: "$_id" } },
    { $count: "upsellOrders" },
  ];

  const [totalRes] = await Order.aggregate(totalOrdersPipeline);
  const [upsellRes] = await Order.aggregate(upsellOrdersPipeline);

  const total = totalRes?.total || 0;
  const upsellOrders = upsellRes?.upsellOrders || 0;
  if (total === 0) return 0;
  return upsellOrders / total;
};

export const getTopUpsellPairings = async (restaurantId, limit = 10) => {
  const match = restaurantId ? { restaurantId } : {};

  const pipeline = [
    { $match: match },
    { $unwind: "$items" },
    { $match: { "items.addedVia": "upsell" } },
    {
      $group: {
        _id: { source: "$items.sourceItemId", upsell: "$items.itemId" },
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: limit },
  ];

  const res = await Order.aggregate(pipeline);
  // Format as array of { sourceItemId, itemId, count }
  return res.map((r) => ({
    sourceItemId: r._id.source,
    itemId: r._id.upsell,
    count: r.count,
  }));
};
