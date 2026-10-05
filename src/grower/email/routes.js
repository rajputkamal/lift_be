import express from "express";
import { timingSafeEqual } from "node:crypto";
import GuestOrder from "../models/guestOrderModel.js";
import { processNotification } from "./service.js";
import { emailConfig } from "./config.js";
const router = express.Router();
export function workerAuthorized(
  header,
  secret = process.env.EMAIL_WORKER_TOKEN,
) {
  if (!secret || secret.length < 32 || typeof header !== "string") return false;
  const expected = Buffer.from(`Bearer ${secret}`),
    actual = Buffer.from(header);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
router.post("/internal/email-notifications/process", async (req, res) => {
  if (!workerAuthorized(req.get("authorization"))) return res.sendStatus(403);
  try {
    const config = emailConfig();
    if (!config.enabled)
      return res.json({
        success: true,
        data: { enabled: false, processed: 0 },
      });
    const deadline = Date.now() + 35000;
    let processed = 0;
    for (let i = 0; i < 20 && Date.now() < deadline; i++) {
      let found = false;
      for (const [Model, field] of [[GuestOrder, "emailNotification"]]) {
        if (Date.now() >= deadline) break;
        if (await processNotification(Model, field, config)) {
          found = true;
          processed++;
        }
      }
      if (!found) break;
    }
    return res.json({ success: true, data: { enabled: true, processed } });
  } catch {
    return res.sendStatus(503);
  }
});
export default router;
