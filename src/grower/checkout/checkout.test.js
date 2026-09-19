import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { validateOrder, schedule } from "./validation.js";
import { signatureValid } from "./razorpay.js";
import { buildOrder } from "./orderService.js";
import { Grower, Product } from "../catalogue.js";
import GuestOrder from "../models/guestOrderModel.js";
import WebhookEvent from "../models/webhookEventModel.js";
import DayReservation from "../models/dayReservationModel.js";
import { reserve, StockConflict } from "./reservations.js";
import { getOrder, createOrder } from "./controller.js";
import { razorpayWebhook } from "./webhook.js";

const growerId = "507f191e810c19729de860ea";
const productId = "507f1f77bcf86cd799439011";
const day = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const body = {
  growerId,
  items: [{ productId, quantity: 2 }],
  purchaseType: "subscription",
  fulfilment: "delivery",
  firstDate: day,
  shipping: {
    name: "Test",
    phone: "9999999999",
    house: "101",
    street: "Street",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500032",
  },
};
const response = () => ({
  statusCode: 200,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
  append() {
    return this;
  },
});
async function stub(patches, fn) {
  const originals = patches.map(([obj, name, value]) => {
    const old = obj[name];
    obj[name] = value;
    return [obj, name, old];
  });
  try {
    await fn();
  } finally {
    originals.forEach(([obj, name, old]) => {
      obj[name] = old;
    });
  }
}

test("checkout validation rejects tampered totals, bad dates and duplicate items", () => {
  assert.deepEqual(validateOrder(body), {});
  assert.ok(validateOrder({ ...body, total: 1 }).total);
  assert.ok(validateOrder({ ...body, firstDate: "2026-02-30" }).firstDate);
  assert.ok(
    validateOrder({ ...body, items: [body.items[0], body.items[0]] })[
      "items.1"
    ],
  );
  assert.equal(schedule(day, "subscription").length, 4);
});

test("backend calculates price and four-week delivery fees", async () => {
  await stub(
    [
      [
        Grower,
        "findOne",
        () => ({
          lean: async () => ({
            _id: growerId,
            name: "Grower",
            deliveryPincodes: ["500032"],
            deliveryFeePaise: 5000,
          }),
        }),
      ],
      [
        Product,
        "find",
        () => ({
          lean: async () => [
            {
              _id: productId,
              name: "Radish",
              slug: "radish",
              pricePaise: 9900,
              stock: 5,
              images: [],
            },
          ],
        }),
      ],
    ],
    async () => {
      const priced = await buildOrder(body);
      assert.equal(priced.basketPaise, 19800);
      assert.equal(priced.totalPaise, 4 * (19800 + 5000));
      await assert.rejects(
        () => buildOrder({ ...body, items: [{ productId, quantity: 6 }] }),
        { code: "OUT_OF_STOCK" },
      );
    },
  );
});

test("checkout and webhook signatures are checked", () => {
  const payload = "order_test|pay_test";
  const secret = "test-secret";
  const signature = createHmac("sha256", secret).update(payload).digest("hex");
  assert.equal(signatureValid(payload, signature, secret), true);
  assert.equal(signatureValid(payload + "x", signature, secret), false);
});

test("guest cannot fetch another guest's order", async () => {
  await stub(
    [
      [
        GuestOrder,
        "findOne",
        async (filter) => {
          assert.equal(filter.guestHash, "owner-hash");
          return null;
        },
      ],
    ],
    async () => {
      const res = response();
      await getOrder(
        { params: { id: productId }, guestHash: "owner-hash" },
        res,
      );
      assert.equal(res.statusCode, 404);
    },
  );
});

test("idempotency key is required", async () => {
  const res = response();
  await createOrder({ get: () => undefined, body }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("reusing an idempotency key with a different request conflicts", async () => {
  const prior = [process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_KEY_SECRET];
  process.env.RAZORPAY_KEY_ID = "rzp_test_example";
  process.env.RAZORPAY_KEY_SECRET = "test-secret";
  try {
    await stub(
      [[GuestOrder, "findOne", async () => ({ requestHash: "different" })]],
      async () => {
        const res = response();
        await createOrder(
          {
            get: () => "same-key-123",
            body,
            headers: { cookie: "grower_guest=" + "a".repeat(64) },
          },
          res,
        );
        assert.equal(res.statusCode, 409);
        assert.equal(res.body.error.code, "IDEMPOTENCY_CONFLICT");
      },
    );
  } finally {
    ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"].forEach((key, i) => {
      if (prior[i] === undefined) delete process.env[key];
      else process.env[key] = prior[i];
    });
  }
});

test("dated capacity rejects concurrent stock conflicts", async () => {
  await stub(
    [
      [Product, "findOneAndUpdate", async () => ({ stock: 2 })],
      [DayReservation, "findOneAndUpdate", async () => null],
      [DayReservation, "exists", () => ({ session: async () => true })],
    ],
    async () => {
      await assert.rejects(
        () => reserve([{ productId, quantity: 1 }], [day], {}),
        StockConflict,
      );
    },
  );
});

test("duplicate webhook event is acknowledged once without processing again", async () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = "webhook-test-secret";
  const raw = Buffer.from(JSON.stringify({ event: "payment.captured" }));
  const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(raw)
    .digest("hex");
  try {
    await stub([[WebhookEvent, "exists", async () => true]], async () => {
      const res = response();
      await razorpayWebhook(
        {
          body: raw,
          get: (name) =>
            name === "x-razorpay-signature" ? signature : "evt_1",
        },
        res,
      );
      assert.deepEqual(res.body.data, { duplicate: true });
    });
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});
