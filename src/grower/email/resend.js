import { recipientAllowed } from "./config.js";

const REQUEST_TIMEOUT_MS = 15_000;
const PERMANENT_HTTP_ERRORS = new Set([400, 401, 403, 404, 422]);

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
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
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
      permanent: PERMANENT_HTTP_ERRORS.has(response.status),
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
