import { createHash } from "node:crypto";
import GuestOrder from "../models/guestOrderModel.js";
import {
  fail,
  idValid,
  pageQuery,
  pagination,
  serverError,
} from "../catalogue.js";
import { guestForCreate } from "./guest.js";
import { validateOrder, shippingSnapshot, schedule } from "./validation.js";
import {
  buildOrder,
  createReservedOrder,
  applyCapturedPayment,
  applyRefund,
  CheckoutError,
} from "./orderService.js";
import {
  config,
  createGatewayOrder,
  fetchPayment,
  fetchOrderPayments,
  signatureValid,
} from "./razorpay.js";

const error = (res, err) =>
  err instanceof CheckoutError
    ? fail(res, err.status, err.code, err.message)
    : serverError(res, err);
const canonical = (v) =>
  Array.isArray(v)
    ? v.map(canonical)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, canonical(v[k])]),
        )
      : v;
const requestHash = (body) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(body)))
    .digest("hex");
const money = (paise) => paise / 100;
export const serializeOrder = (o) => ({
  id: String(o._id),
  growerId: String(o.growerId),
  growerName: o.growerName,
  purchaseType: o.purchaseType,
  fulfilment: o.fulfilment,
  shipping: o.shipping,
  pickupDetails: o.pickupDetails || null,
  items: o.items.map((i) => ({
    productId: String(i.productId),
    name: i.name,
    slug: i.slug,
    quantity: i.quantity,
    unitPrice: money(i.unitPricePaise),
    weight: i.weight,
    thumbnail: i.thumbnail,
  })),
  schedule: o.schedule.map((s) => ({
    id: String(s._id),
    date: s.date,
    status: s.status,
  })),
  basketTotal: money(o.basketPaise),
  deliveryFee: money(o.deliveryFeePaise),
  total: money(o.totalPaise),
  currency: "INR",
  paymentStatus: o.paymentStatus,
  razorpayOrderId: o.razorpayOrderId || null,
  reservationExpiresAt: o.reservationExpiresAt?.toISOString?.() ?? null,
  createdAt: o.createdAt?.toISOString?.() ?? null,
  updatedAt: o.updatedAt?.toISOString?.() ?? null,
});
const checkoutData = (order) => ({
  order: serializeOrder(order),
  payment: order.razorpayOrderId
    ? {
        keyId: config().keyId,
        razorpayOrderId: order.razorpayOrderId,
        amount: order.totalPaise,
        currency: "INR",
      }
    : null,
});

export async function createOrder(req, res) {
  const key = req.get("idempotency-key");
  if (!key || !/^[\w-]{8,100}$/.test(key))
    return fail(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the submitted fields.",
      { idempotencyKey: "Use an 8–100 character Idempotency-Key header." },
    );
  const errors = validateOrder(req.body);
  if (Object.keys(errors).length)
    return fail(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the submitted fields.",
      errors,
    );
  try {
    config();
  } catch (err) {
    // config() emits only fixed diagnostics, never credential values.
    console.error("Grower checkout payment configuration:", err.message);
    return fail(
      res,
      503,
      "PAYMENT_NOT_CONFIGURED",
      "Test payment gateway is unavailable.",
    );
  }
  const guestHash = guestForCreate(req, res);
  const fingerprint = requestHash(req.body);
  try {
    let order = await GuestOrder.findOne({ guestHash, idempotencyKey: key });
    if (order) {
      if (order.requestHash !== fingerprint)
        return fail(
          res,
          409,
          "IDEMPOTENCY_CONFLICT",
          "This key was used for a different request.",
        );
      return res
        .status(order.gatewayState === "ready" ? 200 : 202)
        .json({ success: true, data: checkoutData(order) });
    }
    const priced = await buildOrder(req.body);
    const dates = schedule(req.body.firstDate, req.body.purchaseType);
    const data = {
      items: priced.items,
      order: {
        guestHash,
        idempotencyKey: key,
        requestHash: fingerprint,
        growerId: priced.grower._id,
        growerName: priced.grower.name,
        purchaseType: req.body.purchaseType,
        fulfilment: req.body.fulfilment,
        shipping: shippingSnapshot(req.body.shipping, req.body.fulfilment),
        pickupDetails:
          req.body.fulfilment === "pickup" ? priced.grower.pickupDetails : "",
        basketPaise: priced.basketPaise,
        deliveryFeePaise: priced.deliveryFeePaise,
        totalPaise: priced.totalPaise,
      },
    };
    try {
      order = await createReservedOrder(data, dates);
    } catch (err) {
      const previous = await GuestOrder.findOne({
        guestHash,
        idempotencyKey: key,
      });
      if (previous)
        return previous.requestHash === fingerprint
          ? res
              .status(202)
              .json({ success: true, data: checkoutData(previous) })
          : fail(
              res,
              409,
              "IDEMPOTENCY_CONFLICT",
              "This key was used for a different request.",
            );
      throw err;
    }
    const claimed = await GuestOrder.findOneAndUpdate(
      { _id: order._id, gatewayState: "new" },
      { $set: { gatewayState: "creating" } },
      { new: true },
    );
    if (!claimed)
      return res.status(202).json({ success: true, data: checkoutData(order) });
    try {
      const gateway = await createGatewayOrder(order);
      if (
        !gateway?.id ||
        gateway.amount !== order.totalPaise ||
        gateway.currency !== "INR"
      )
        throw new Error("Invalid gateway order response");
      order = await GuestOrder.findByIdAndUpdate(
        order._id,
        { $set: { razorpayOrderId: gateway.id, gatewayState: "ready" } },
        { new: true },
      );
      return res.status(201).json({ success: true, data: checkoutData(order) });
    } catch (err) {
      console.error("Razorpay order creation uncertain:", err.message);
      await GuestOrder.updateOne(
        { _id: order._id, gatewayState: "creating" },
        { $set: { gatewayState: "unknown" } },
      );
      return res.status(202).json({
        success: true,
        data: {
          order: serializeOrder(order),
          payment: null,
          action:
            "Contact support; gateway creation is being reviewed. Do not retry with a new key.",
        },
      });
    }
  } catch (err) {
    return error(res, err);
  }
}

export async function listOrders(req, res) {
  const pg = pageQuery(req.query);
  if (!pg)
    return fail(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the submitted fields.",
      { pagination: "Invalid page or limit." },
    );
  try {
    const filter = { guestHash: req.guestHash };
    const [rows, total] = await Promise.all([
      GuestOrder.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pg.skip)
        .limit(pg.limit),
      GuestOrder.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      data: rows.map(serializeOrder),
      pagination: pagination(pg.page, pg.limit, total),
    });
  } catch (err) {
    return serverError(res, err);
  }
}
export async function getOrder(req, res) {
  if (!idValid(req.params.id))
    return fail(res, 404, "NOT_FOUND", "Order not found.");
  try {
    const order = await GuestOrder.findOne({
      _id: req.params.id,
      guestHash: req.guestHash,
    });
    return order
      ? res.json({ success: true, data: serializeOrder(order) })
      : fail(res, 404, "NOT_FOUND", "Order not found.");
  } catch (err) {
    return serverError(res, err);
  }
}
const owned = async (req) =>
  idValid(req.params.id)
    ? GuestOrder.findOne({ _id: req.params.id, guestHash: req.guestHash })
    : null;
export async function verifyPayment(req, res) {
  try {
    const order = await owned(req);
    if (!order) return fail(res, 404, "NOT_FOUND", "Order not found.");
    const {
      razorpay_payment_id: paymentId,
      razorpay_order_id: gatewayOrderId,
      razorpay_signature: signature,
    } = req.body || {};
    if (
      typeof paymentId !== "string" ||
      typeof gatewayOrderId !== "string" ||
      gatewayOrderId !== order.razorpayOrderId ||
      !signatureValid(
        `${order.razorpayOrderId}|${paymentId}`,
        signature,
        config().keySecret,
      )
    )
      return fail(
        res,
        400,
        "INVALID_SIGNATURE",
        "Payment signature is invalid.",
      );
    const payment = await fetchPayment(paymentId);
    const updated = await applyCapturedPayment(order._id, payment);
    return res.json({ success: true, data: serializeOrder(updated) });
  } catch (err) {
    return error(res, err);
  }
}
export async function reconcilePayment(req, res) {
  try {
    const order = await owned(req);
    if (!order) return fail(res, 404, "NOT_FOUND", "Order not found.");
    if (!order.razorpayOrderId || order.paymentStatus === "refunded")
      return res.json({ success: true, data: serializeOrder(order) });
    const results = await fetchOrderPayments(order.razorpayOrderId);
    const payments = results.items || [];
    const valid = (p) =>
      p.order_id === order.razorpayOrderId &&
      p.amount === order.totalPaise &&
      p.currency === "INR";
    const refunded = payments.find(
      (p) => valid(p) && (p.status === "refunded" || p.amount_refunded > 0),
    );
    if (refunded)
      return res.json({
        success: true,
        data: serializeOrder(
          await applyRefund(
            order._id,
            refunded.id,
            refunded.amount_refunded || order.totalPaise,
          ),
        ),
      });
    const captured = payments.find((p) => valid(p) && p.status === "captured");
    if (captured)
      return res.json({
        success: true,
        data: serializeOrder(await applyCapturedPayment(order._id, captured)),
      });
    return res.json({ success: true, data: serializeOrder(order) });
  } catch (err) {
    return error(res, err);
  }
}
