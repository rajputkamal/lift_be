import mongoose from "mongoose";

const OrderItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String },
    quantity: { type: Number, default: 1 },
    price: { type: Number, required: true },
    addedVia: { type: String, enum: ["chat", "upsell"], required: true },
    sourceItemId: { type: String, default: null },
  },
  { _id: false },
);

const OrderSchema = new mongoose.Schema(
  {
    restaurantId: { type: String, required: true },
    sessionId: { type: String, required: true },
    items: { type: [OrderItemSchema], default: [] },
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true },
);

// Indexes to optimize analytics queries
OrderSchema.index({ restaurantId: 1 });
OrderSchema.index({ "items.addedVia": 1 });

const Order = mongoose.model("Order", OrderSchema);

export default Order;
