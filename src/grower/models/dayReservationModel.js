import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, required: true },
    date: { type: String, required: true },
    reserved: { type: Number, required: true, min: 0 },
  },
  { timestamps: true },
);
schema.index({ productId: 1, date: 1 }, { unique: true });
export default mongoose.model("GrowerDayReservation", schema);
