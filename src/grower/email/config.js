export const validEmail = (value) =>
  typeof value === "string" &&
  value.length <= 254 &&
  /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(value);

export function emailConfig(env = process.env) {
  const allowlist = (env.EMAIL_TEST_RECIPIENT_ALLOWLIST || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  return {
    enabled:
      env.SERVICE_MODE === "microgreens" &&
      env.EMAIL_NOTIFICATIONS_ENABLED === "true",
    test: env.MICROGREENS_ENVIRONMENT !== "production",
    allowlist,
    apiKey: env.RESEND_API_KEY,
    orderFrom:
      env.ORDER_EMAIL_FROM || "Micro Greens Kart <orders@microgreenskart.in>",
    orderReply: env.ORDER_EMAIL_REPLY_TO || "orders@microgreenskart.in",
  };
}
export function recipientAllowed(recipient, config) {
  return (
    validEmail(recipient) &&
    (!config.test || config.allowlist.includes(recipient.toLowerCase()))
  );
}
