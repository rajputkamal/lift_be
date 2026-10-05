import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import GuestOrder from "./models/guestOrderModel.js";
import { applyCapturedPayment } from "./checkout/orderService.js";
import { emailConfig } from "./email/config.js";
import {
  notification,
  processNotification,
  sendEmail,
} from "./email/service.js";
import { orderEmail } from "./email/templates.js";
import { workerAuthorized } from "./email/routes.js";
const config = emailConfig({
  SERVICE_MODE: "microgreens",
  EMAIL_NOTIFICATIONS_ENABLED: "true",
  MICROGREENS_ENVIRONMENT: "test",
  EMAIL_TEST_RECIPIENT_ALLOWLIST: "test@example.com",
  RESEND_API_KEY: "mock",
});
const order = () => ({
  _id: "order1",
  createdAt: new Date("2026-09-29T20:00:00Z"),
  growerName: "GreenLeaf",
  shipping: {
    name: '<script>alert("x")</script>',
    email: "test@example.com",
    phone: "9999999999",
    house: "1",
    street: "Road",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500032",
  },
  items: [
    { name: "Sunflower", weight: "50g", quantity: 1, unitPricePaise: 11900 },
  ],
  basketPaise: 11900,
  deliveryFeePaise: 0,
  totalPaise: 11900,
  fulfilment: "pickup",
  pickupDetails: "Farm & gate",
  purchaseType: "one-time",
  paymentStatus: "paid",
  deliveryDays: ["Wednesday"],
  schedule: [{ date: "2099-01-01" }],
  emailNotification: notification(
    "order-confirmation",
    "order1",
    "test@example.com",
    config,
  ),
});
function model(row) {
  return {
    async findOneAndUpdate(filter, update) {
      const n = row.emailNotification;
      if (
        !["pending", "retry"].includes(n.status) &&
        !(n.status === "sending" && n.leaseUntil <= new Date())
      )
        return null;
      if (
        ["pending", "retry"].includes(n.status) &&
        n.nextAttemptAt > new Date()
      )
        return null;
      for (const [path, v] of Object.entries(update.$set))
        n[path.split(".")[1]] = v;
      n.attempts++;
      return structuredClone(row);
    },
    async updateOne(filter, update) {
      if (
        filter["emailNotification.leaseToken"] !==
          row.emailNotification.leaseToken ||
        row.emailNotification.status !== "sending"
      )
        return;
      for (const [path, v] of Object.entries(update.$set))
        row.emailNotification[path.split(".")[1]] = v;
    },
  };
}
test("disabled notifications and test restrictions make no provider requests", async () => {
  let calls = 0;
  const fetchMock = async () => {
    calls++;
  };
  await sendEmail(
    { to: ["test@example.com"] },
    "key",
    { ...config, enabled: false },
    fetchMock,
  );
  await sendEmail({ to: ["customer@example.com"] }, "key", config, fetchMock);
  await processNotification(
    model(order()),
    "emailNotification",
    { ...config, enabled: false },
    fetchMock,
  );
  assert.equal(calls, 0);
  assert.equal(
    emailConfig({ EMAIL_NOTIFICATIONS_ENABLED: "true" }).enabled,
    false,
  );
  assert.equal(
    notification("order-confirmation", "1", "", config).status,
    "suppressed",
  );
});
test("concurrent workers accept one email; repeat runs do not resend", async () => {
  const row = order(),
    Model = model(row);
  let calls = 0;
  const provider = async (_url, options) => {
    calls++;
    assert.equal(
      options.headers["Idempotency-Key"],
      row.emailNotification.eventKey,
    );
    assert.ok(JSON.parse(options.body).text);
    return { ok: true, json: async () => ({ id: "msg1" }) };
  };
  await Promise.all([
    processNotification(Model, "emailNotification", config, provider),
    processNotification(Model, "emailNotification", config, provider),
  ]);
  await processNotification(Model, "emailNotification", config, provider);
  assert.equal(calls, 1);
  assert.equal(row.emailNotification.status, "accepted");
  assert.equal(row.emailNotification.providerMessageId, "msg1");
});
test("provider failure retries unchanged payload and never changes payment status", async () => {
  const row = order(),
    Model = model(row);
  await processNotification(Model, "emailNotification", config, async () => {
    throw new Error("secret/PII");
  });
  assert.equal(row.paymentStatus, "paid");
  assert.equal(row.emailNotification.status, "retry");
  assert.equal(row.emailNotification.lastError, "provider_outcome_unknown");
  const saved = structuredClone(row.emailNotification.payload);
  row.emailNotification.nextAttemptAt = new Date(0);
  row.shipping.name = "Changed name";
  await processNotification(
    Model,
    "emailNotification",
    config,
    async (_url, options) => {
      assert.deepEqual(JSON.parse(options.body), saved);
      return { ok: true, json: async () => ({ id: "msg2" }) };
    },
  );
  assert.equal(row.emailNotification.status, "accepted");
  assert.equal(row.emailNotification.attempts, 2);
});
test("uncertain sends beyond retention are held for review; pending/refunded send nothing", async () => {
  for (const state of [
    "pending",
    "expired",
    "refunded",
    "resolution_required",
  ]) {
    const row = order();
    row.paymentStatus = state;
    await processNotification(
      model(row),
      "emailNotification",
      config,
      async () => assert.fail("must not send"),
    );
    assert.equal(row.emailNotification.status, "suppressed");
  }
  const row = order();
  row.emailNotification.firstAttemptAt = new Date(Date.now() - 24 * 3600000);
  await processNotification(model(row), "emailNotification", config, async () =>
    assert.fail("must not replay"),
  );
  assert.equal(row.emailNotification.status, "review");
});
test("templates preserve pickup, address, actual weekdays, subscription amounts and escape HTML", () => {
  const row = order();
  const pickup = orderEmail(row);
  assert.match(pickup.html, /&lt;script&gt;/);
  assert.doesNotMatch(pickup.html, /<script>/);
  assert.match(pickup.text, /30 September 2026/);
  assert.match(pickup.text, /pickup date and time/);
  assert.match(pickup.html, /<table/);
  assert.match(pickup.text, /Delivery fee: Free/);
  row.fulfilment = "delivery";
  row.purchaseType = "subscription";
  row.schedule = [1, 2, 3, 4].map((i) => ({ date: `2099-01-0${i}` }));
  row.basketPaise = row.totalPaise = 47600;
  const delivery = orderEmail(row);
  assert.match(delivery.text, /4 scheduled deliveries/);
  assert.match(delivery.text, /Per-delivery subtotal: ₹119.00/);
  assert.match(delivery.text, /Total paid: ₹476.00/);
  assert.match(delivery.text, /Wednesday/);
  assert.doesNotMatch(delivery.text, /Saturday|Sunday/);
  assert.match(delivery.text, /Hyderabad, Telangana, 500032/);
});
test("worker requires a private token", () => {
  assert.equal(workerAuthorized("Bearer short", "short"), false);
  assert.equal(
    workerAuthorized(`Bearer ${"a".repeat(32)}`, "a".repeat(32)),
    true,
  );
});
test("captured payment creates a durable notification in the paid save; duplicate events preserve it", async () => {
  const row = order();
  row.paymentStatus = "pending";
  row.emailEligible = true;
  delete row.emailNotification;
  row.razorpayOrderId = "gateway1";
  row.reserved = true;
  let saves = 0;
  row.save = async ({ session }) => {
    assert.ok(session);
    saves++;
    assert.equal(row.paymentStatus, "paid");
    assert.ok(row.emailNotification);
  };
  const oldSession = mongoose.startSession,
    oldFind = GuestOrder.findById;
  mongoose.startSession = async () => ({
    withTransaction: async (fn) => fn(),
    endSession: async () => {},
  });
  GuestOrder.findById = () => ({ session: async () => row });
  try {
    const captured = {
      order_id: "gateway1",
      amount: 11900,
      currency: "INR",
      status: "captured",
      id: "pay1",
    };
    await assert.rejects(
      applyCapturedPayment("order1", { ...captured, status: "failed" }),
      { code: "PAYMENT_MISMATCH" },
    );
    assert.equal(saves, 0);
    assert.equal(row.emailNotification, undefined);
    await applyCapturedPayment("order1", captured);
    const n = row.emailNotification;
    await applyCapturedPayment("order1", captured);
    assert.equal(row.emailNotification, n);
    assert.equal(saves, 1);
  } finally {
    mongoose.startSession = oldSession;
    GuestOrder.findById = oldFind;
  }
});
