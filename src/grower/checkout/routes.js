import express from "express";
import {
  createOrder,
  listOrders,
  getOrder,
  verifyPayment,
  reconcilePayment,
} from "./controller.js";
import { requireGuest, checkGuestOrigin } from "./guest.js";
import { razorpayWebhook } from "./webhook.js";

const router = express.Router();
router.post("/orders", checkGuestOrigin, createOrder);
router.get("/orders", requireGuest, listOrders);
router.get("/orders/:id", requireGuest, getOrder);
router.post(
  "/orders/:id/payment/verify",
  checkGuestOrigin,
  requireGuest,
  verifyPayment,
);
router.post(
  "/orders/:id/payment/reconcile",
  checkGuestOrigin,
  requireGuest,
  reconcilePayment,
);
export default router;
export { razorpayWebhook };
