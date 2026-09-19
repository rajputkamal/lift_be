import mongoose from "mongoose";

const item = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: String,
    slug: String,
    quantity: Number,
    unitPricePaise: Number,
    weight: String,
    thumbnail: String,
  },
  { _id: false },
);
const fulfilment = new mongoose.Schema({
  date: { type: String, required: true },
  status: {
    type: String,
    enum: ["scheduled", "preparing", "out_for_delivery", "ready", "completed"],
    default: "scheduled",
  },
});
const orderSchema = new mongoose.Schema(
  {
    guestHash: { type: String, required: true, index: true },
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    growerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    growerName: String,
    purchaseType: {
      type: String,
      enum: ["one-time", "subscription"],
      required: true,
    },
    fulfilment: { type: String, enum: ["delivery", "pickup"], required: true },
    shipping: { type: mongoose.Schema.Types.Mixed, required: true },
    pickupDetails: String,
    items: { type: [item], required: true },
    schedule: { type: [fulfilment], required: true },
    basketPaise: { type: Number, required: true },
    deliveryFeePaise: { type: Number, required: true },
    totalPaise: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded", "resolution_required", "expired"],
      default: "pending",
      index: true,
    },
    gatewayState: {
      type: String,
      enum: ["new", "creating", "ready", "unknown"],
      default: "new",
    },
    razorpayOrderId: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String, default: null },
    reservationExpiresAt: { type: Date, required: true, index: true },
    reserved: { type: Boolean, default: true },
  },
  { timestamps: true },
);
orderSchema.index({ guestHash: 1, idempotencyKey: 1 }, { unique: true });
orderSchema.index({ paymentStatus: 1, reservationExpiresAt: 1 });
export default mongoose.model("GuestOrder", orderSchema);
