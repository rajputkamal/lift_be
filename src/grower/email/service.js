import { randomUUID } from "node:crypto";
import { emailConfig, recipientAllowed } from "./config.js";
import { orderEmail } from "./templates.js";
import { sendEmail } from "./resend.js";

export { sendEmail } from "./resend.js";

const LEASE_DURATION_MS = 60_000;
const IDEMPOTENCY_WINDOW_MS = 23 * 60 * 60 * 1_000;
const MAX_RETRY_DELAY_MS = 60 * 60 * 1_000;
const SAFE_PROVIDER_ERROR =
  /^provider_(http_\d{3}|not_configured|outcome_unknown)$/;

export function notification(type, id, recipient, config = emailConfig()) {
  const allowed = config.enabled && recipientAllowed(recipient, config);
  return {
    eventKey: `microgreens/${type}/${id}`,
    type,
    recipient,
    status: allowed ? "pending" : "suppressed",
    attempts: 0,
    nextAttemptAt: new Date(),
    lastError: allowed ? undefined : "disabled_or_recipient_restricted",
  };
}

// Mongo atomically claims one embedded outbox. Permanent records retain stable event keys.
export async function processNotification(
  Model,
  field,
  config = emailConfig(),
  fetchImpl = fetch,
) {
  if (!config.enabled) return false;
  const now = new Date();
  const token = randomUUID();
  const due = {
    $or: [
      {
        [`${field}.status`]: { $in: ["pending", "retry"] },
        [`${field}.nextAttemptAt`]: { $lte: now },
      },
      {
        [`${field}.status`]: "sending",
        [`${field}.leaseUntil`]: { $lte: now },
      },
    ],
  };
  const row = await Model.findOneAndUpdate(
    due,
    {
      $set: {
        [`${field}.status`]: "sending",
        [`${field}.leaseToken`]: token,
        [`${field}.leaseUntil`]: new Date(now.valueOf() + LEASE_DURATION_MS),
      },
      $inc: { [`${field}.attempts`]: 1 },
    },
    { new: true },
  );
  if (!row) return false;
  const entry = row[field];
  const filter = {
    _id: row._id,
    [`${field}.leaseToken`]: token,
    [`${field}.status`]: "sending",
  };
  const finish = (values) =>
    Model.updateOne(filter, {
      $set: Object.fromEntries(
        Object.entries(values).map(([key, value]) => [
          `${field}.${key}`,
          value,
        ]),
      ),
    });
  if (!recipientAllowed(entry.recipient, config)) {
    await finish({ status: "suppressed", lastError: "recipient_restricted" });
    return true;
  }
  if (field === "emailNotification" && row.paymentStatus !== "paid") {
    await finish({ status: "suppressed", lastError: "order_not_paid" });
    return true;
  }
  // A timeout/crash may have occurred after provider acceptance. Never replay outside
  // the provider's 24-hour dedup window; use a conservative 23-hour local cutoff.
  if (
    entry.firstAttemptAt &&
    now - entry.firstAttemptAt >= IDEMPOTENCY_WINDOW_MS
  ) {
    await finish({ status: "review", lastError: "idempotency_window_elapsed" });
    return true;
  }
  const payload = entry.payload || {
    ...orderEmail(row),
    to: [entry.recipient],
    from: config.orderFrom,
    reply_to: config.orderReply,
  };
  // Freeze the exact payload before the first provider call, including sender config.
  await finish({ payload, firstAttemptAt: entry.firstAttemptAt || now });
  try {
    const result = await sendEmail(payload, entry.eventKey, config, fetchImpl);
    await finish(
      result.suppressed
        ? { status: "suppressed" }
        : {
            status: "accepted",
            providerMessageId: result.id,
            acceptedAt: new Date(),
            lastError: "",
          },
    );
  } catch (err) {
    await finish({
      status: err.permanent ? "failed" : "retry",
      lastError: SAFE_PROVIDER_ERROR.test(err.code || "")
        ? err.code
        : "provider_outcome_unknown",
      nextAttemptAt: new Date(
        Date.now() +
          Math.min(
            MAX_RETRY_DELAY_MS,
            LEASE_DURATION_MS * 2 ** Math.min(entry.attempts, 6),
          ),
      ),
    });
  }
  return true;
}
