import mongoose from "mongoose";
import dotenv from "dotenv";
import { validateMicrogreensDatabase } from "./microgreens.js";

dotenv.config({ quiet: true });

const connectDB = async () => {
  try {
    if (process.env.SERVICE_MODE === "microgreens")
      validateMicrogreensDatabase(process.env.MONGO_URI);
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed");
    process.exit(1);
  }
};

const connectRidesDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
    startExpireRidesCron();
  } catch (error) {
    console.error("MongoDB connection failed");
    process.exit(1);
  }
};

const connectFoodieDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
    startExpireRidesCron();
  } catch (error) {
    console.error("MongoDB connection failed");
    process.exit(1);
  }
};

export default connectDB;
