import mongoose from "mongoose";

const restaurantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    logoUrl: {
      type: String,
      default: null,
    },

    address: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
    },

    vegType: {
      type: String,
      enum: ["veg", "non-veg", "egg", "both"],
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("Restaurant", restaurantSchema);
