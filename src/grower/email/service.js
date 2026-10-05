import { randomUUID } from "node:crypto";
import { emailConfig, recipientAllowed } from "./config.js";
import { orderEmail } from "./templates.js";

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

export async function sendEmail(payload, eventKey, config, fetchImpl = fetch) {
  if (!config.enabled || !recipientAllowed(payload.to[0], config))
    return { suppressed: true };
  if (!config.apiKey)
    throw Object.assign(new Error("provider_not_configured"), {
      code: "provider_not_configured",
    });
  let response;
  try {
    response = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": eventKey,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw Object.assign(new Error("provider_outcome_unknown"), {
      code: "provider_outcome_unknown",
    });
  }
  if (!response.ok) {
    const code = `provider_http_${response.status}`;
    throw Object.assign(new Error(code), {
      code,
      permanent: [400, 401, 403, 404, 422].includes(response.status),
    });
  }
  let result;
  try {
    result = await response.json();
  } catch {
    /* Unknown acceptance; retry same key. */
  }
  if (typeof result?.id !== "string" || !result.id.length)
    throw Object.assign(new Error("provider_outcome_unknown"), {
      code: "provider_outcome_unknown",
    });
  return { id: result.id };
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
        [`${field}.leaseUntil`]: new Date(now.valueOf() + 60000),
      },
      $inc: { [`${field}.attempts`]: 1 },
    },
    { new: true },
  );
  if (!row) return false;
  const n = row[field];
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
  if (!recipientAllowed(n.recipient, config)) {
    await finish({ status: "suppressed", lastError: "recipient_restricted" });
    return true;
  }
  if (field === "emailNotification" && row.paymentStatus !== "paid") {
    await finish({ status: "suppressed", lastError: "order_not_paid" });
    return true;
  }
  // A timeout/crash may have occurred after provider acceptance. Never replay outside
  // the provider's 24-hour dedup window; use a conservative 23-hour local cutoff.
  if (n.firstAttemptAt && now - n.firstAttemptAt >= 23 * 3600000) {
    await finish({ status: "review", lastError: "idempotency_window_elapsed" });
    return true;
  }
  const template = orderEmail(row);
  const payload = n.payload || {
    ...template,
    to: [n.recipient],
    from: config.orderFrom,
    reply_to: config.orderReply,
  };
  // Freeze the exact payload before the first provider call, including sender config.
  await finish({ payload, firstAttemptAt: n.firstAttemptAt || now });
  try {
    const result = await sendEmail(payload, n.eventKey, config, fetchImpl);
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
      lastError: /^provider_(http_\d{3}|not_configured|outcome_unknown)$/.test(
        err.code || "",
      )
        ? err.code
        : "provider_outcome_unknown",
      nextAttemptAt: new Date(
        Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(n.attempts, 6)),
      ),
    });
  }
  return true;
}
