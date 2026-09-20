import test from "node:test";
import assert from "node:assert/strict";
import {
  allowedFrontendOrigins,
  corsOptions,
  isAllowedFrontendOrigin,
} from "../config/cors.js";

test("CORS includes the MVP frontend origins and parses configured origins", () => {
  assert.deepEqual(allowedFrontendOrigins(""), [
    "http://localhost:3000",
    "https://green-sprout-store.vercel.app",
  ]);
  assert.deepEqual(
    allowedFrontendOrigins(
      "http://localhost:3000, https://growers.example.com, http://localhost:3000",
    ),
    [
      "http://localhost:3000",
      "https://green-sprout-store.vercel.app",
      "https://growers.example.com",
    ],
  );
});

test("guest origin checks use the same CORS allowlist", () => {
  const previous = process.env.ALLOWED_FRONTEND_ORIGINS;
  process.env.ALLOWED_FRONTEND_ORIGINS =
    "http://localhost:3000,https://growers.example.com";
  try {
    assert.equal(isAllowedFrontendOrigin(undefined), true);
    assert.equal(isAllowedFrontendOrigin("http://localhost:3000"), true);
    assert.equal(isAllowedFrontendOrigin("https://growers.example.com"), true);
    assert.equal(isAllowedFrontendOrigin("https://attacker.example"), false);
  } finally {
    if (previous === undefined) delete process.env.ALLOWED_FRONTEND_ORIGINS;
    else process.env.ALLOWED_FRONTEND_ORIGINS = previous;
  }
});

test("credentialed CORS reflects allowed origins and rejects other origins", () => {
  const previous = process.env.ALLOWED_FRONTEND_ORIGINS;
  process.env.ALLOWED_FRONTEND_ORIGINS = "http://localhost:3000";
  try {
    assert.equal(corsOptions.credentials, true);
    corsOptions.origin("http://localhost:3000", (error, allowed) => {
      assert.equal(error, null);
      assert.equal(allowed, true);
    });
    corsOptions.origin("https://attacker.example", (error, allowed) => {
      assert.equal(error, null);
      assert.equal(allowed, false);
    });
  } finally {
    if (previous === undefined) delete process.env.ALLOWED_FRONTEND_ORIGINS;
    else process.env.ALLOWED_FRONTEND_ORIGINS = previous;
  }
});
