import test from "node:test";
import assert from "node:assert/strict";
import { validate, publicGrower } from "./catalogue.js";
import { deliveryError } from "./delivery.js";
import { buildOrder } from "./checkout/orderService.js";
import Grower from "./models/growerModel.js";
const grower = {
  _id: "g",
  city: "Hyderabad",
  deliveryDays: ["monday"],
  isCitywideDelivery: false,
  serviceablePincodes: ["500032"],
  deliveryPincodes: ["500032"],
};
const body = {
  fulfilment: "delivery",
  firstDate: "2026-10-05",
  shipping: { city: " Hyderabad ", pincode: "500032" },
};
test("grower delivery fields validate types, weekdays and safe optional website", () => {
  const result = validate(
    "grower",
    {
      deliveryDays: ["sunday", "monday", "monday"],
      isCitywideDelivery: true,
      serviceablePincodes: ["500032", "500032"],
      websiteUrl: "https://example.com/store",
    },
    grower,
  );
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.value.deliveryDays, ["monday", "sunday"]);
  assert.deepEqual(result.value.serviceablePincodes, ["500032"]);
  for (const websiteUrl of [
    "javascript:alert(1)",
    "http://example.com",
    "https://user:pass@example.com",
    "not a url",
  ])
    assert.ok(validate("grower", { websiteUrl }, grower).errors.websiteUrl);
  assert.deepEqual(validate("grower", { websiteUrl: null }, grower).value, {
    websiteUrl: null,
  });
  assert.ok(
    validate("grower", { deliveryDays: ["Monday"] }, grower).errors
      .deliveryDays,
  );
  assert.ok(
    validate("grower", { isCitywideDelivery: "true" }, grower).errors
      .isCitywideDelivery,
  );
  assert.ok(
    validate("grower", { serviceablePincodes: ["000000"] }, grower).errors
      .serviceablePincodes,
  );
  assert.deepEqual(publicGrower(grower).deliveryDays, ["monday"]);
});
test("delivery days and coverage are enforced without changing pickup or free-fee rules", () => {
  assert.equal(deliveryError(grower, body), null);
  assert.equal(
    deliveryError(grower, { ...body, firstDate: "2026-10-06" }).code,
    "DELIVERY_DAY_UNAVAILABLE",
  );
  assert.equal(
    deliveryError({ ...grower, deliveryDays: [] }, body).code,
    "DELIVERY_DAY_UNAVAILABLE",
  );
  assert.equal(
    deliveryError(grower, {
      ...body,
      shipping: { ...body.shipping, pincode: "500033" },
    }).code,
    "DELIVERY_AREA_UNAVAILABLE",
  );
  assert.equal(
    deliveryError(
      { ...grower, isCitywideDelivery: true },
      { ...body, shipping: { city: "hyderabad", pincode: "500099" } },
    ),
    null,
  );
  assert.equal(
    deliveryError(
      { ...grower, isCitywideDelivery: true },
      { ...body, shipping: { city: "Chennai", pincode: "600001" } },
    ).code,
    "DELIVERY_AREA_UNAVAILABLE",
  );
  assert.equal(
    deliveryError(grower, {
      ...body,
      fulfilment: "pickup",
      firstDate: "2026-10-06",
    }),
    null,
  );
  assert.equal(deliveryError({ city: "Hyderabad" }, body), null);
});
test("checkout rejects unavailable delivery before reserving inventory or creating payment", async () => {
  const original = Grower.findOne;
  Grower.findOne = () => ({ lean: async () => grower });
  try {
    await assert.rejects(
      () => buildOrder({ ...body, firstDate: "2026-10-06" }),
      { code: "DELIVERY_DAY_UNAVAILABLE" },
    );
    await assert.rejects(
      () =>
        buildOrder({
          ...body,
          shipping: { ...body.shipping, pincode: "500033" },
        }),
      { code: "DELIVERY_AREA_UNAVAILABLE" },
    );
  } finally {
    Grower.findOne = original;
  }
});
