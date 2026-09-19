import { config, fetchPayment, signatureValid } from "./razorpay.js";
import { applyCapturedPayment, applyRefund } from "./orderService.js";
import GuestOrder from "../models/guestOrderModel.js";
import WebhookEvent from "../models/webhookEventModel.js";
import { fail, serverError } from "../catalogue.js";

export async function razorpayWebhook(req, res) {
  const signature = req.get("x-razorpay-signature");
  const eventId = req.get("x-razorpay-event-id");
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (
    !secret ||
    !Buffer.isBuffer(req.body) ||
    !signatureValid(req.body, signature, secret)
  )
    return fail(res, 403, "INVALID_SIGNATURE", "Webhook signature is invalid.");
  if (!eventId || eventId.length > 200)
    return fail(res, 400, "INVALID_EVENT", "Event ID is required.");
  try {
    if (await WebhookEvent.exists({ eventId }))
      return res.json({ success: true, data: { duplicate: true } });
    const event = JSON.parse(req.body.toString("utf8"));
    if (event.event === "payment.captured") {
      config();
      const candidate = event.payload?.payment?.entity;
      if (!candidate?.id || !candidate.order_id)
        return fail(res, 400, "INVALID_EVENT", "Payment payload is invalid.");
      const order = await GuestOrder.findOne({
        razorpayOrderId: candidate.order_id,
      });
      if (order)
        await applyCapturedPayment(order._id, await fetchPayment(candidate.id));
    } else if (event.event === "refund.processed") {
      const refund = event.payload?.refund?.entity;
      const payment = event.payload?.payment?.entity;
      if (
        !refund?.payment_id ||
        !payment?.order_id ||
        refund.payment_id !== payment.id
      )
        return fail(res, 400, "INVALID_EVENT", "Refund payload is invalid.");
      const order = await GuestOrder.findOne({
        razorpayOrderId: payment.order_id,
      });
      if (order && refund.status === "processed" && refund.currency === "INR")
        await applyRefund(
          order._id,
          refund.payment_id,
          payment.amount_refunded || refund.amount,
        );
    }
    await WebhookEvent.create({ eventId });
    return res.json({ success: true, data: { processed: true } });
  } catch (err) {
    if (err.code === 11000)
      return res.json({ success: true, data: { duplicate: true } });
    return serverError(res, err);
  }
}
