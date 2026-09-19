import mongoose from "mongoose";
import DayReservation from "../models/dayReservationModel.js";
import Product from "../models/productModel.js";

export class StockConflict extends Error {}
export async function reserve(items, dates, session) {
  for (const date of dates)
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.productId, isActive: true, stock: { $gte: item.quantity } },
        { $inc: { inventoryVersion: 1 } },
        { new: true, session },
      );
      if (!product) throw new StockConflict("Product capacity changed");
      const filter = { productId: item.productId, date };
      const updated = await DayReservation.findOneAndUpdate(
        { ...filter, reserved: { $lte: product.stock - item.quantity } },
        { $inc: { reserved: item.quantity } },
        { new: true, session },
      );
      if (updated) continue;
      const existing = await DayReservation.exists(filter).session(session);
      if (existing) throw new StockConflict("Insufficient dated capacity");
      try {
        await DayReservation.create([{ ...filter, reserved: item.quantity }], {
          session,
        });
      } catch (err) {
        if (err.code === 11000)
          throw new StockConflict("Concurrent reservation conflict");
        throw err;
      }
    }
}
export async function release(order, session) {
  if (!order.reserved) return;
  for (const slot of order.schedule)
    for (const item of order.items) {
      await DayReservation.updateOne(
        {
          productId: item.productId,
          date: slot.date,
          reserved: { $gte: item.quantity },
        },
        { $inc: { reserved: -item.quantity } },
        { session },
      );
    }
}
export async function transaction(fn) {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(() => fn(session));
  } finally {
    await session.endSession();
  }
}
