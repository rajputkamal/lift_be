import moment from "moment-timezone";

import { Ride } from "../models/rideModel.js";
import User from "../models/userModel.js";

export const postRide = async (req, res) => {
  try {
    const {
      origin,
      destination,
      originCoords,
      destinationCoords,
      price,
      distance,
      time,
      seatsAvailable,
      vehicleType,
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Set expiry after 7 days
    const expiresAt = moment()
      .tz("Asia/Kolkata")
      .add(7, "days")
      .endOf("day")
      .toDate();

    const newRide = await Ride.create({
      userId: user._id,
      userName: user.name,
      userNumber: user.phoneNumber,
      userImage: user.image || "",
      vehicleNumber: user.vehicleNumber,
      vehicleType,
      origin,
      destination,
      originCoords,
      destinationCoords,
      time,
      seatsAvailable,
      distance,
      price,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      message: "Ride created successfully",
      ride: newRide,
    });
  } catch (error) {
    console.error("Error posting ride:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllRides = async (_, res) => {
  try {
    const rides = await Ride.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      rides,
    });
  } catch (error) {
    console.error("Error fetching rides:", error);
    res.status(500).json({ success: false, message: "Error fetching rides" });
  }
};
