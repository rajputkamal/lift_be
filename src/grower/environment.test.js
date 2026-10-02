import test from "node:test";
import assert from "node:assert/strict";
import {
  microgreensEnvironment,
  validateMicrogreensDatabase,
} from "../config/microgreens.js";
import { allowedFrontendOrigins } from "../config/cors.js";
const uri = (database) =>
  `mongodb+srv://user:dummy@cluster.example/${database}?retryWrites=true`;
test("test and production refuse each other's database", () => {
  assert.equal(validateMicrogreensDatabase(uri("rides"), "test"), "rides");
  assert.equal(
    validateMicrogreensDatabase(uri("microgreenskart"), "production"),
    "microgreenskart",
  );
  assert.throws(
    () => validateMicrogreensDatabase(uri("rides"), "production"),
    /requires database microgreenskart/,
  );
  assert.throws(
    () => validateMicrogreensDatabase(uri("microgreenskart"), "test"),
    /requires database rides/,
  );
  for (const value of [
    uri(""),
    uri("other"),
    uri("rides") + "&dbName=microgreenskart",
    "invalid",
  ])
    assert.throws(() => validateMicrogreensDatabase(value, "test"));
  assert.throws(
    () => microgreensEnvironment("staging"),
    /must be test or production/,
  );
});
test("test API allows test frontend and excludes production origin by default", () => {
  const saved = { ...process.env };
  try {
    process.env.SERVICE_MODE = "microgreens";
    process.env.NODE_ENV = "production";
    process.env.MICROGREENS_ENVIRONMENT = "test";
    const testOrigins = allowedFrontendOrigins("");
    assert.deepEqual(testOrigins, ["https://test.microgreenskart.in"]);
    process.env.MICROGREENS_ENVIRONMENT = "production";
    const prodOrigins = allowedFrontendOrigins("");
    assert.ok(prodOrigins.includes("https://microgreenskart.in"));
    assert.ok(!prodOrigins.includes("https://test.microgreenskart.in"));
  } finally {
    for (const key of ["SERVICE_MODE", "NODE_ENV", "MICROGREENS_ENVIRONMENT"])
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
  }
});
