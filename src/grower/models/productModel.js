import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    growerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Grower",
      required: true,
      index: true,
    },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    shortDescription: { type: String, required: true },
    description: { type: String, required: true },
    pricePaise: { type: Number, required: true, min: 1 },
    weight: { type: String, required: true },
    images: { type: [String], default: [] },
    category: { type: String, required: true },
    cultivationDate: { type: String, default: null },
    harvestDate: { type: String, default: null },
    bestBefore: { type: String, default: null },
    storage: { type: String, required: true },
    stock: { type: Number, required: true, min: 0 },
    inventoryVersion: { type: Number, default: 0 },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true },
);

productSchema.index({ growerId: 1, isActive: 1, category: 1, _id: 1 });
productSchema.index({ isActive: 1, _id: 1 });

export default mongoose.model("GrowerProduct", productSchema);
