export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value / 100,
  );
const paragraph = (value) =>
  `<p style="line-height:1.6;margin:12px 0">${escapeHtml(value)}</p>`;
const wrap = (content) =>
  `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;background:#f3f6f2;color:#183325;font-family:Arial,sans-serif"><main style="max-width:640px;margin:24px auto;padding:24px;background:white;border-radius:12px"><h1 style="font-size:24px">Micro Greens Kart</h1>${content}</main></body></html>`;
const table = (head, rows) =>
  `<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px">${head ? `<thead><tr>${head.map((v) => `<th style="text-align:left;padding:8px;border-bottom:2px solid #dce7dc">${escapeHtml(v)}</th>`).join("")}</tr></thead>` : ""}<tbody>${rows.map((row) => `<tr>${row.map((v) => `<td style="padding:8px;border-bottom:1px solid #dce7dc">${escapeHtml(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
export function orderEmail(order) {
  const s = order.shipping || {};
  const date = order.createdAt
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(order.createdAt))
    : "Not recorded";
  const rows = order.items.map((i) => [
    i.name,
    i.weight || "—",
    i.quantity,
    money(i.unitPricePaise),
    money(i.unitPricePaise * i.quantity),
  ]);
  const summary = [
    ["Subtotal", money(order.basketPaise)],
    [
      "Delivery fee",
      order.deliveryFeePaise ? money(order.deliveryFeePaise) : "Free",
    ],
    ["Total paid", money(order.totalPaise)],
  ];
  const deliveries = order.schedule?.length || 0;
  const subscription = order.purchaseType === "subscription";
  const location =
    order.fulfilment === "pickup"
      ? order.pickupDetails
      : [s.house, s.building, s.street, s.landmark, s.city, s.state, s.pincode]
          .filter(Boolean)
          .join(", ");
  const fulfilment =
    order.fulfilment === "pickup"
      ? "You’ll receive a WhatsApp message or email with your pickup date and time. We’ll have your fresh greens ready for handover within 7 days of ordering."
      : "Your fresh greens will be delivered within 7 days of ordering. Our team will arrange delivery on your grower’s delivery days.";
  const sections = [
    `Hi ${s.name || "there"},`,
    "Thank you for ordering from Micro Greens Kart! Your payment was successful, and your order is confirmed.",
    `Order ID: ${order._id}`,
    `Order date: ${date}`,
    `Grower: ${order.growerName || "Not recorded"}`,
  ];
  const details = [
    `Payment: Paid`,
    `Order type: ${subscription ? "Prepaid subscription" : "One-time"}`,
    ...(subscription
      ? [
          `${deliveries} scheduled deliveries. Item quantities and line totals above are per delivery; the payment summary covers the entire subscription.`,
          ...(deliveries
            ? [
                `Per-delivery subtotal: ${money(order.basketPaise / deliveries)}; delivery fee: ${money(order.deliveryFeePaise / deliveries)}; total: ${money(order.totalPaise / deliveries)}.`,
              ]
            : []),
        ]
      : []),
    `Fulfilment: ${order.fulfilment}`,
    fulfilment,
    ...(order.fulfilment === "delivery" && order.deliveryDays?.length
      ? [`Grower delivery days: ${order.deliveryDays.join(", ")}`]
      : []),
    ...(order.schedule?.length
      ? [
          `Saved fulfilment dates: ${order.schedule.map((v) => v.date).join(", ")}`,
        ]
      : []),
    `${order.fulfilment === "pickup" ? "Collection location" : "Delivery address"}: ${location || "Not recorded"}`,
    `Phone: ${s.phone || "Not recorded"}`,
    ...(s.email ? [`Email: ${s.email}`] : []),
    "Please check the details above. If anything needs correcting, reply to this email and include your order ID.",
    "Thank you,",
    "Team Micro Greens Kart",
    "orders@microgreenskart.in",
    "https://microgreenskart.in",
  ];
  return {
    subject: `Your Micro Greens Kart order is confirmed — ${order._id}`,
    text: [
      ...sections,
      "Your order" + (subscription ? " (per delivery)" : ""),
      ...rows.map((r) => r.join(" | ")),
      "Payment summary",
      ...summary.map((r) => r.join(": ")),
      ...details,
    ].join("\n\n"),
    html: wrap(
      sections.map(paragraph).join("") +
        `<h2>Your order${subscription ? " (per delivery)" : ""}</h2>` +
        table(["Item", "Weight", "Qty", "Unit price", "Line total"], rows) +
        "<h2>Payment summary</h2>" +
        table(null, summary) +
        details.map(paragraph).join(""),
    ),
  };
}
