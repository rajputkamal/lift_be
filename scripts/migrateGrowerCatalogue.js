import "dotenv/config";
import mongoose from "mongoose";
import Grower from "../src/grower/models/growerModel.js";
import Product from "../src/grower/models/productModel.js";
import GuestOrder from "../src/grower/models/guestOrderModel.js";
import DayReservation from "../src/grower/models/dayReservationModel.js";
import WebhookEvent from "../src/grower/models/webhookEventModel.js";

try {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([
    Grower.createIndexes(),
    Product.createIndexes(),
    GuestOrder.createIndexes(),
    DayReservation.createIndexes(),
    WebhookEvent.createIndexes(),
  ]);
  console.log("Grower catalogue and order indexes created.");
} catch (error) {
  console.error("Catalogue migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
