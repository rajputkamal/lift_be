import "dotenv/config";
import mongoose from "mongoose";
import GuestOrder from "../src/grower/models/guestOrderModel.js";
import { expireOrder } from "../src/grower/checkout/orderService.js";

try {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is required");
  await mongoose.connect(process.env.MONGO_URI);
  const expired = await GuestOrder.find({
    paymentStatus: "pending",
    reserved: true,
    reservationExpiresAt: { $lte: new Date() },
  })
    .select("_id")
    .limit(500)
    .lean();
  let count = 0;
  for (const order of expired) if (await expireOrder(order._id)) count++;
  await (
    await import("../src/grower/models/dayReservationModel.js")
  ).default.deleteMany({
    date: { $lt: new Date().toISOString().slice(0, 10) },
  });
  console.log(`Expired ${count} unpaid grower reservations.`);
} catch (err) {
  console.error("Reservation cleanup failed:", err.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
