import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import WebhookEvent from "./models/webhookEventModel.js";
import assert from "node:assert/strict";
import { createApp } from "../../app.js";
import { guestForCreate } from "./checkout/guest.js";
import { Grower, Product } from "./catalogue.js";

async function serving(mode, fn) {
  const app = await createApp({ mode });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await fn(`http://127.0.0.1:${server.address().port}`, app);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
test("microgreens exposes new and legacy routes, excludes unrelated surfaces", async () => {
  await serving("microgreens", async (base) => {
    for (const path of [
      "/api/auth/me",
      "/api/user/profile",
      "/api/ride/available",
      "/api/foodie/restaurants",
      "/uploads/nidhi_logo.png",
    ]) {
      assert.equal((await fetch(base + path)).status, 404);
    }
    for (const path of ["/v1/orders", "/api/grower-checkout/v1/orders"])
      assert.equal((await fetch(base + path)).status, 401);
    assert.equal(
      (
        await fetch(base + "/v1/webhooks/razorpay", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        })
      ).status,
      403,
    );
    assert.equal((await fetch(base + "/health")).status, 200);
    assert.equal((await fetch(base + "/ready")).status, 503);
    const preflight = await fetch(base + "/v1/orders", {
      method: "OPTIONS",
      headers: {
        origin: "https://micro-greens.foodieai.in",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type,idempotency-key",
      },
    });
    assert.equal(preflight.status, 204);
    assert.equal(
      preflight.headers.get("access-control-allow-credentials"),
      "true",
    );
    const actual = await fetch(base + "/v1/orders", {
      headers: { origin: "https://micro-greens.foodieai.in" },
    });
    assert.equal(
      actual.headers.get("access-control-allow-origin"),
      "https://micro-greens.foodieai.in",
    );
    assert.equal(
      (
        await fetch(base + "/v1/orders", {
          method: "POST",
          headers: {
            origin: "https://attacker.example",
            "content-type": "application/json",
          },
          body: "{}",
        })
      ).status,
      403,
    );
  });
});
test("default retains Lift authentication routes and legacy checkout", async () => {
  await serving("default", async (base) => {
    assert.equal((await fetch(base + "/api/auth/me")).status, 401);
    assert.equal((await fetch(base + "/api/user/profile")).status, 401);
    assert.equal((await fetch(base + "/api/ride/available")).status, 401);
    assert.equal(
      (await fetch(base + "/api/grower-checkout/v1/orders")).status,
      401,
    );
    assert.equal((await fetch(base + "/v1/orders")).status, 404);
  });
});
test("new cookie path follows mounted checkout prefix", () => {
  let cookie;
  guestForCreate(
    { baseUrl: "/v1", headers: { origin: "https://microgreenskart.in" } },
    { append: (_name, value) => (cookie = value) },
  );
  assert.match(cookie, /Path=\/v1;/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=None; Secure/);
});
test("catalogue GET routes share controllers across new and old prefixes", async () => {
  const originals = [
    Grower.find,
    Grower.countDocuments,
    Product.find,
    Product.countDocuments,
  ];
  const query = () => ({
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    lean: async () => [],
  });
  Grower.find = Product.find = query;
  Grower.countDocuments = Product.countDocuments = async () => 0;
  try {
    await serving("microgreens", async (base) => {
      for (const resource of ["growers", "products"]) {
        const old = await fetch(
          `${base}/api/grower/v1/${resource}?isActive=true&page=1&limit=100`,
        );
        const next = await fetch(
          `${base}/v1/${resource}?isActive=true&page=1&limit=100`,
        );
        assert.equal(next.status, 200);
        assert.deepEqual(await next.json(), await old.json());
      }
    });
  } finally {
    [Grower.find, Grower.countDocuments, Product.find, Product.countDocuments] =
      originals;
  }
});

test("production microgreens CORS permits domains and denies configured localhost", async () => {
  const keys = ["SERVICE_MODE", "NODE_ENV", "ALLOWED_FRONTEND_ORIGINS"];
  const previous = keys.map((key) => process.env[key]);
  process.env.SERVICE_MODE = "microgreens";
  process.env.NODE_ENV = "production";
  process.env.ALLOWED_FRONTEND_ORIGINS = "http://localhost:5173,*";
  try {
    await serving("microgreens", async (base, app) => {
      app.locals.ready = true;
      assert.equal((await fetch(base + "/ready")).status, 200);
      for (const origin of [
        "https://microgreenskart.in",
        "https://www.microgreenskart.in",
      ]) {
        const response = await fetch(base + "/v1/orders", {
          headers: { origin },
        });
        assert.equal(
          response.headers.get("access-control-allow-origin"),
          origin,
        );
        assert.equal(
          response.headers.get("access-control-allow-credentials"),
          "true",
        );
      }
      for (const origin of [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://attacker.example",
        "null",
      ]) {
        const response = await fetch(base + "/v1/orders", {
          headers: { origin },
        });
        assert.equal(response.headers.get("access-control-allow-origin"), null);
      }
    });
  } finally {
    keys.forEach((key, index) => {
      if (previous[index] === undefined) delete process.env[key];
      else process.env[key] = previous[index];
    });
  }
});

test("microgreens startup imports no Lift/Foodie models", () => {
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    await import('./app.js');
    const { default: mongoose } = await import('mongoose');
    console.log(JSON.stringify(mongoose.modelNames()));
  `,
    ],
    {
      cwd: new URL("../../", import.meta.url),
      env: { ...process.env, SERVICE_MODE: "microgreens" },
      encoding: "utf8",
    },
  );
  const models = JSON.parse(output.trim());
  assert.ok(models.includes("GrowerWebhookEvent"));
  assert.ok(models.includes("Grower"));
  assert.ok(
    models.every((name) => name.startsWith("Grower") || name === "GuestOrder"),
    models.join(","),
  );
});

test("signed webhook raw parsing and retry deduplication work on both paths", async () => {
  const previousSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const originalExists = WebhookEvent.exists;
  const originalCreate = WebhookEvent.create;
  process.env.RAZORPAY_WEBHOOK_SECRET = "local-webhook-test";
  let records = 0;
  WebhookEvent.exists = async () => records > 0;
  WebhookEvent.create = async () => {
    records++;
  };
  const body = JSON.stringify({ event: "test.ignored" });
  const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  try {
    await serving("microgreens", async (base) => {
      for (const path of [
        "/v1/webhooks/razorpay",
        "/api/grower-checkout/v1/webhooks/razorpay",
      ]) {
        const response = await fetch(base + path, {
          method: "POST",
          body,
          headers: {
            "content-type": "application/json",
            "x-razorpay-signature": signature,
            "x-razorpay-event-id": "test-event",
          },
        });
        assert.equal(response.status, 200);
        const result = await response.json();
        assert.deepEqual(
          result.data,
          path.startsWith("/v1") ? { processed: true } : { duplicate: true },
        );
      }
      assert.equal(records, 1);
    });
  } finally {
    WebhookEvent.exists = originalExists;
    WebhookEvent.create = originalCreate;
    if (previousSecret === undefined)
      delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previousSecret;
  }
});

test("Firebase session cookie round-trips without the legacy cookie", async () => {
  const { guestForCreate, parseCookie, requireGuest, hash } =
    await import("./checkout/guest.js");
  const previous = process.env.GUEST_COOKIE_NAME;
  process.env.GUEST_COOKIE_NAME = "__session";
  try {
    let cookie;
    guestForCreate(
      { baseUrl: "/v1", headers: { origin: "https://microgreenskart.in" } },
      { append: (_name, value) => (cookie = value) },
    );
    assert.match(cookie, /^__session=[a-f0-9]{64}; HttpOnly; Path=\/v1;/);
    const incoming = { headers: { cookie: cookie.split(";")[0] } };
    let passed = false;
    requireGuest(incoming, {}, () => {
      passed = true;
    });
    assert.equal(passed, true);
    assert.equal(incoming.guestHash, hash(parseCookie(incoming)));
    assert.equal(
      parseCookie({ headers: { cookie: "grower_guest=" + "a".repeat(64) } }),
      null,
    );
    await serving("microgreens", async (base) => {
      const response = await fetch(base + "/v1/orders");
      assert.equal(response.headers.get("cache-control"), "private, no-store");
    });
    process.env.GUEST_COOKIE_NAME = "invalid; Path=/";
    await assert.rejects(
      () => createApp({ mode: "microgreens" }),
      /GUEST_COOKIE_NAME/,
    );
  } finally {
    if (previous === undefined) delete process.env.GUEST_COOKIE_NAME;
    else process.env.GUEST_COOKIE_NAME = previous;
  }
});

test("microgreens denies catalogue writes on both prefixes without blocking checkout", async () => {
  await serving("microgreens", async (base) => {
    for (const prefix of ["/v1", "/api/grower/v1"]) {
      for (const resource of ["growers", "products"]) {
        for (const method of ["POST", "PATCH", "DELETE"]) {
          const path =
            prefix +
            "/" +
            resource +
            (method === "POST" ? "" : "/507f191e810c19729de860ea");
          const response = await fetch(base + path, {
            method,
            headers: { "content-type": "application/json" },
            body: "{}",
          });
          assert.equal(response.status, 403);
          assert.equal(
            (await response.json()).error.code,
            "CATALOGUE_WRITES_DISABLED",
          );
        }
      }
    }
    const response = await fetch(base + "/v1/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 400);
  });
});
