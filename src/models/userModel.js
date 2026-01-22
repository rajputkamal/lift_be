import mongoose from "mongoose";

const rideSummarySchema = new mongoose.Schema(
  {
    activeRides: { type: Number, default: 0, min: 0 },
    completedRides: { type: Number, default: 0, min: 0 },
    totalRides: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    phoneNumber: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      default: "",
    },
    vehicleType: {
      type: String,
      enum: ["car", "bike"],
      default: null,
    },
    vehicleNumber: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
    },
    rideSummary: {
      type: rideSummarySchema,
      default: () => ({}),
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
