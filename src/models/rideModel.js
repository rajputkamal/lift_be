import mongoose from "mongoose";

const rideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userNumber: {
      type: String,
      required: true,
    },
    userImage: {
      type: String,
      default: "",
    },
    origin: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    originCoords: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    destinationCoords: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    time: {
      type: String,
      required: true,
    },
    seatsAvailable: {
      type: Number,
      required: true,
      min: 1,
      max: 6,
    },
    distance: {
      type: Number,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export const Ride = mongoose.model("Ride", rideSchema);
