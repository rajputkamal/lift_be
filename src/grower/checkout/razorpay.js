import { createHmac, timingSafeEqual } from "node:crypto";

export function config() {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  if (!keyId) throw new Error("RAZORPAY_KEY_ID is missing or blank");
  if (!keyId.startsWith("rzp_test_"))
    throw new Error("RAZORPAY_KEY_ID must be a Test Mode key (rzp_test_)");
  if (!keySecret) throw new Error("RAZORPAY_KEY_SECRET is missing or blank");
  return { keyId, keySecret };
}
export function signatureValid(payload, signature, secret) {
  if (typeof signature !== "string" || !/^[a-f0-9]{64}$/i.test(signature))
    return false;
  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  return timingSafeEqual(
    Buffer.from(signature.toLowerCase()),
    Buffer.from(expected),
  );
}
async function api(path, method = "GET", body) {
  const { keyId, keySecret } = config();
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    ...(body && { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Razorpay API status ${response.status}`);
  return response.json();
}
export const createGatewayOrder = (localOrder) =>
  api("/orders", "POST", {
    amount: localOrder.totalPaise,
    currency: "INR",
    receipt: String(localOrder._id),
    notes: { localOrderId: String(localOrder._id) },
  });
export const fetchPayment = (id) => api(`/payments/${encodeURIComponent(id)}`);
export const fetchOrderPayments = (id) =>
  api(`/orders/${encodeURIComponent(id)}/payments`);
