import mongoose from "mongoose";

const growerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: { type: String, default: null },
    coverImage: { type: String, default: null },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, required: true },
    pincode: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    deliveryText: { type: String, default: "" },
    deliveryFeePaise: { type: Number, default: 0, min: 0 },
    deliveryPincodes: { type: [String], default: [] },
    pickupDetails: { type: String, default: "" },
    isActive: { type: Boolean, default: false },
    inventoryVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

growerSchema.index({ isActive: 1, city: 1, area: 1, _id: 1 });
growerSchema.index({ name: 1, _id: 1 });

export default mongoose.model("Grower", growerSchema);
