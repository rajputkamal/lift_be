import { Grower, Product } from "../catalogue.js";
import GuestOrder from "../models/guestOrderModel.js";
import {
  reserve,
  release,
  StockConflict,
  transaction,
} from "./reservations.js";

export class CheckoutError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
export async function buildOrder(body) {
  const grower = await Grower.findOne({
    _id: body.growerId,
    isActive: true,
  }).lean();
  if (!grower)
    throw new CheckoutError(
      "GROWER_UNAVAILABLE",
      "Grower is unavailable.",
      404,
    );
  if (body.fulfilment === "pickup" && !grower.pickupDetails)
    throw new CheckoutError(
      "PICKUP_UNAVAILABLE",
      "Pickup is unavailable for this grower.",
    );
  const ids = body.items.map((item) => item.productId);
  const products = await Product.find({
    _id: { $in: ids },
    growerId: grower._id,
    isActive: true,
  }).lean();
  if (products.length !== ids.length)
    throw new CheckoutError(
      "PRODUCT_UNAVAILABLE",
      "One or more products are unavailable.",
    );
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const items = body.items.map((entry) => {
    const p = byId.get(String(entry.productId));
    if (entry.quantity > p.stock)
      throw new CheckoutError(
        "OUT_OF_STOCK",
        `${p.name} has insufficient stock.`,
        409,
      );
    return {
      productId: p._id,
      name: p.name,
      slug: p.slug,
      quantity: entry.quantity,
      unitPricePaise: p.pricePaise,
      weight: p.weight,
      thumbnail: p.images?.[0] ?? null,
      stock: p.stock,
    };
  });
  const basketPerFulfilmentPaise = items.reduce(
    (sum, item) => sum + item.unitPricePaise * item.quantity,
    0,
  );
  const repeats = body.purchaseType === "subscription" ? 4 : 1;
  const isFreeDelivery =
    body.fulfilment === "delivery" &&
    (grower.deliveryPincodes || []).includes(body.shipping.pincode.trim());
  const deliveryFeePerFulfilmentPaise =
    body.fulfilment === "delivery" && !isFreeDelivery
      ? grower.deliveryFeePaise || 0
      : 0;
  const basketPaise = basketPerFulfilmentPaise * repeats;
  const deliveryFeePaise = deliveryFeePerFulfilmentPaise * repeats;
  const totalPaise = basketPaise + deliveryFeePaise;
  if (!Number.isSafeInteger(totalPaise) || totalPaise < 100)
    throw new CheckoutError("INVALID_AMOUNT", "Order amount is invalid.");
  return { grower, items, basketPaise, deliveryFeePaise, totalPaise };
}
export async function createReservedOrder(data, dates) {
  try {
    return await transaction(async (session) => {
      const grower = await Grower.findOneAndUpdate(
        { _id: data.order.growerId, isActive: true },
        { $inc: { inventoryVersion: 1 } },
        { new: true, session },
      );
      if (!grower)
        throw new CheckoutError(
          "GROWER_UNAVAILABLE",
          "Grower is unavailable.",
          404,
        );
      await reserve(data.items, dates, session);
      const [order] = await GuestOrder.create(
        [
          {
            ...data.order,
            items: data.items.map(({ stock, ...item }) => item),
            schedule: dates.map((date) => ({ date, status: "scheduled" })),
            reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          },
        ],
        { session },
      );
      return order;
    });
  } catch (err) {
    if (
      err instanceof StockConflict ||
      err.code === 11000 ||
      err.hasErrorLabel?.("TransientTransactionError")
    )
      throw new CheckoutError(
        "STOCK_CONFLICT",
        "Capacity is unavailable. Please retry.",
        409,
      );
    throw err;
  }
}
export async function applyCapturedPayment(orderId, payment) {
  try {
    return await transaction(async (session) => {
      const order = await GuestOrder.findById(orderId).session(session);
      if (!order) return null;
      if (["refunded", "resolution_required"].includes(order.paymentStatus))
        return order;
      if (order.paymentStatus === "paid") return order;
      if (
        payment.order_id !== order.razorpayOrderId ||
        payment.amount !== order.totalPaise ||
        payment.currency !== "INR" ||
        payment.status !== "captured"
      )
        throw new CheckoutError(
          "PAYMENT_MISMATCH",
          "Payment details do not match this order.",
          409,
        );
      const today = new Date().toISOString().slice(0, 10);
      if (order.schedule.some((slot) => slot.date < today)) {
        order.paymentStatus = "resolution_required";
        await order.save({ session });
        return order;
      }
      if (!order.reserved) {
        const grower = await Grower.findOneAndUpdate(
          { _id: order.growerId, isActive: true },
          { $inc: { inventoryVersion: 1 } },
          { new: true, session },
        );
        const products = await Product.find({
          _id: { $in: order.items.map((i) => i.productId) },
          growerId: order.growerId,
          isActive: true,
        })
          .session(session)
          .lean();
        if (!grower || products.length !== order.items.length) {
          order.paymentStatus = "resolution_required";
          await order.save({ session });
          return order;
        }
        const byId = new Map(products.map((p) => [String(p._id), p]));
        const items = order.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          stock: byId.get(String(i.productId))?.stock ?? 0,
        }));
        if (items.some((i) => i.stock < i.quantity)) {
          order.paymentStatus = "resolution_required";
          await order.save({ session });
          return order;
        }
        await reserve(
          items,
          order.schedule.map((s) => s.date),
          session,
        );
        order.reserved = true;
      }
      order.paymentStatus = "paid";
      order.razorpayPaymentId = payment.id;
      await order.save({ session });
      return order;
    });
  } catch (err) {
    if (!(err instanceof StockConflict) && err.code !== 11000) throw err;
    return GuestOrder.findByIdAndUpdate(
      orderId,
      { $set: { paymentStatus: "resolution_required" } },
      { new: true },
    );
  }
}
export async function applyRefund(orderId, paymentId, refundedPaise) {
  return transaction(async (session) => {
    const order = await GuestOrder.findById(orderId).session(session);
    if (
      !order ||
      (order.razorpayPaymentId && order.razorpayPaymentId !== paymentId)
    )
      return order;
    if (order.paymentStatus === "refunded") return order;
    if (refundedPaise >= order.totalPaise) {
      order.paymentStatus = "refunded";
      await release(order, session);
      order.reserved = false;
    } else order.paymentStatus = "resolution_required";
    order.razorpayPaymentId = paymentId;
    await order.save({ session });
    return order;
  });
}
export async function expireOrder(orderId) {
  return transaction(async (session) => {
    const order = await GuestOrder.findOne({
      _id: orderId,
      paymentStatus: "pending",
      reserved: true,
      reservationExpiresAt: { $lte: new Date() },
    }).session(session);
    if (!order) return false;
    await release(order, session);
    order.reserved = false;
    order.paymentStatus = "expired";
    await order.save({ session });
    return true;
  });
}
