import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
