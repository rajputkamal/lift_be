import { idValid } from "../catalogue.js";

export const realDate = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00.000Z`);
  return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === s;
};
export function schedule(firstDate, purchaseType) {
  if (!realDate(firstDate)) return null;
  const first = new Date(`${firstDate}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (first < today || first > new Date(today.valueOf() + 90 * 86400000))
    return null;
  return Array.from(
    { length: purchaseType === "subscription" ? 4 : 1 },
    (_, i) =>
      new Date(first.valueOf() + i * 7 * 86400000).toISOString().slice(0, 10),
  );
}
const text = (v, max) =>
  typeof v === "string" && v.trim().length > 0 && v.trim().length <= max;
const optional = (v, max) =>
  v === undefined || (typeof v === "string" && v.trim().length <= max);
export function validateOrder(body) {
  const errors = {};
  if (!body || typeof body !== "object" || Array.isArray(body))
    return { body: "JSON object required." };
  const allowed = new Set([
    "growerId",
    "items",
    "purchaseType",
    "fulfilment",
    "firstDate",
    "shipping",
  ]);
  for (const key of Object.keys(body))
    if (!allowed.has(key)) errors[key] = "Unknown field.";
  if (!idValid(body.growerId)) errors.growerId = "Valid growerId is required.";
  if (!["one-time", "subscription"].includes(body.purchaseType))
    errors.purchaseType = "Use one-time or subscription.";
  if (!["delivery", "pickup"].includes(body.fulfilment))
    errors.fulfilment = "Use delivery or pickup.";
  if (!schedule(body.firstDate, body.purchaseType))
    errors.firstDate = "Use a real date from today through 90 days ahead.";
  if (
    !Array.isArray(body.items) ||
    body.items.length < 1 ||
    body.items.length > 30
  )
    errors.items = "Use 1–30 items.";
  else {
    const seen = new Set();
    body.items.forEach((item, i) => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item) ||
        Object.keys(item).some((k) => !["productId", "quantity"].includes(k)) ||
        !idValid(item.productId) ||
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 100 ||
        seen.has(String(item.productId))
      )
        errors[`items.${i}`] =
          "Use a distinct productId and quantity from 1 to 100.";
      else seen.add(String(item.productId));
    });
  }
  const s = body.shipping;
  if (!s || typeof s !== "object" || Array.isArray(s))
    errors.shipping = "Shipping details are required.";
  else {
    const fields = new Set([
      "name",
      "phone",
      "email",
      "house",
      "building",
      "street",
      "landmark",
      "city",
      "state",
      "pincode",
    ]);
    for (const key of Object.keys(s))
      if (!fields.has(key)) errors[`shipping.${key}`] = "Unknown field.";
    if (!text(s.name, 100))
      errors["shipping.name"] = "Name is required (max 100).";
    if (
      typeof s.phone !== "string" ||
      !/^(?:\+91[ -]?)?[6-9]\d{9}$/.test(s.phone.trim())
    )
      errors["shipping.phone"] = "Valid Indian mobile number required.";
    if (
      !optional(s.email, 254) ||
      (s.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.trim()))
    )
      errors["shipping.email"] = "Invalid email.";
    if (body.fulfilment === "delivery") {
      for (const key of ["house", "street", "city", "state"])
        if (!text(s[key], 120))
          errors[`shipping.${key}`] = "Required for delivery (max 120).";
      if (typeof s.pincode !== "string" || !/^\d{6}$/.test(s.pincode.trim()))
        errors["shipping.pincode"] = "Six-digit pincode required.";
      for (const key of ["building", "landmark"])
        if (!optional(s[key], 120))
          errors[`shipping.${key}`] = "Maximum 120 characters.";
    }
  }
  return errors;
}
export function shippingSnapshot(s, fulfilment) {
  const basic = {
    name: s.name.trim(),
    phone: s.phone.trim(),
    email: s.email?.trim() || "",
  };
  if (fulfilment === "pickup") return basic;
  return {
    ...basic,
    house: s.house.trim(),
    building: s.building?.trim() || "",
    street: s.street.trim(),
    landmark: s.landmark?.trim() || "",
    city: s.city.trim(),
    state: s.state.trim(),
    pincode: s.pincode.trim(),
  };
}
