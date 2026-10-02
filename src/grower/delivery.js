export const DELIVERY_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
export const DEFAULT_DELIVERY_DAYS = ["saturday", "sunday"];

export function deliveryError(grower, body) {
  if (body.fulfilment !== "delivery") return null;
  if (Array.isArray(grower.deliveryDays)) {
    const day = new Date(`${body.firstDate}T00:00:00Z`).getUTCDay();
    if (!grower.deliveryDays.includes(DELIVERY_DAYS[(day + 6) % 7]))
      return {
        code: "DELIVERY_DAY_UNAVAILABLE",
        message: "This grower does not deliver on the selected weekday.",
      };
  }
  // Legacy records retain existing coverage until explicitly configured.
  if (typeof grower.isCitywideDelivery !== "boolean") return null;
  if (grower.isCitywideDelivery) {
    if (
      body.shipping.city.trim().toLowerCase() !==
      grower.city?.trim().toLowerCase()
    )
      return {
        code: "DELIVERY_AREA_UNAVAILABLE",
        message: "This grower delivers only within their city.",
      };
  } else if (
    !(grower.serviceablePincodes || []).includes(body.shipping.pincode.trim())
  ) {
    return {
      code: "DELIVERY_AREA_UNAVAILABLE",
      message: "This grower does not deliver to this pincode.",
    };
  }
  return null;
}
