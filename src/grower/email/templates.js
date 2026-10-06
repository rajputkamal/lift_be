import { paragraph, wrap, table } from "./layout.js";
export { escapeHtml } from "./layout.js";

const money = (value) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    value / 100,
  );
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
