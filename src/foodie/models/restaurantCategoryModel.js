import mongoose from "mongoose";

const restaurantCategorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
  },
  { timestamps: true },
);

// Prevent duplicate attachments
restaurantCategorySchema.index(
  { restaurantId: 1, categoryId: 1 },
  { unique: true },
);

export default mongoose.model("RestaurantCategory", restaurantCategorySchema);
