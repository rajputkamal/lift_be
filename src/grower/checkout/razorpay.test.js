import test from "node:test";
import assert from "node:assert/strict";
import { config } from "./razorpay.js";

const names = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"];
function withConfig(id, secret, check) {
  const previous = names.map((name) => process.env[name]);
  try {
    [id, secret].forEach((value, index) => {
      if (value === undefined) delete process.env[names[index]];
      else process.env[names[index]] = value;
    });
    check();
  } finally {
    previous.forEach((value, index) => {
      if (value === undefined) delete process.env[names[index]];
      else process.env[names[index]] = value;
    });
  }
}

test("checkout normalizes surrounding whitespace in deployment credentials", () => {
  withConfig(" rzp_test_example\n", " test-secret\n", () => {
    assert.deepEqual(config(), {
      keyId: "rzp_test_example",
      keySecret: "test-secret",
    });
  });
});

test("checkout rejects missing, blank and live credentials with safe diagnostics", () => {
  for (const id of [undefined, "", "  "]) {
    withConfig(id, "private-secret", () =>
      assert.throws(config, { message: "RAZORPAY_KEY_ID is missing or blank" }),
    );
  }
  withConfig("rzp_live_private", "private-secret", () =>
    assert.throws(config, {
      message: "RAZORPAY_KEY_ID must be a Test Mode key (rzp_test_)",
    }),
  );
  for (const secret of [undefined, "", "  "]) {
    withConfig("rzp_test_example", secret, () =>
      assert.throws(config, {
        message: "RAZORPAY_KEY_SECRET is missing or blank",
      }),
    );
  }
});
