// Test-only, additive migration. Supply MONGO_URI securely; no secret is logged.
import mongoose from "mongoose";
import { writeFileSync } from "node:fs";
import Grower from "../src/grower/models/growerModel.js";
import { validateMicrogreensDatabase } from "../src/config/microgreens.js";
import { DEFAULT_DELIVERY_DAYS } from "../src/grower/delivery.js";
const apply = process.argv.includes("--apply");
try {
  validateMicrogreensDatabase(process.env.MONGO_URI, "test");
  await mongoose.connect(process.env.MONGO_URI);
  const growers = await Grower.collection.find({}).sort({ _id: 1 }).toArray();
  const backup = [];
  let updated = 0;
  for (const [index, grower] of growers.entries()) {
    const defaults = {
      deliveryDays: [...DEFAULT_DELIVERY_DAYS],
      isCitywideDelivery: index === 0,
      serviceablePincodes: [
        ...new Set(
          [...(grower.deliveryPincodes || []), grower.pincode].filter(Boolean),
        ),
      ],
      websiteUrl: null,
    };
    const missing = Object.fromEntries(
      Object.entries(defaults).filter(([key]) => grower[key] === undefined),
    );
    if (!Object.keys(missing).length) continue;
    backup.push({ id: String(grower._id), addedFields: Object.keys(missing) });
    if (apply) {
      // Conditional writes preserve any values added concurrently by an administrator.
      for (const [key, value] of Object.entries(missing))
        await Grower.collection.updateOne(
          { _id: grower._id, [key]: { $exists: false } },
          { $set: { [key]: value } },
        );
    }
    updated++;
  }
  if (apply)
    writeFileSync(
      "/private/tmp/microgreens-grower-delivery-backfill.json",
      JSON.stringify(backup, null, 2),
      { mode: 0o600 },
    );
  console.log(
    JSON.stringify({
      database: mongoose.connection.name,
      apply,
      growers: growers.length,
      affected: updated,
    }),
  );
} catch (error) {
  console.error("Test grower backfill failed:", error.name);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
