import { Ride } from "../models/rideModel.js";
import User from "../models/userModel.js";
import { calculatePrice } from "../../utils/calculatePrice.js";

export const postRide = async (req, res) => {
  try {
    const {
      origin,
      destination,
      originCoords,
      destinationCoords,
      time,
      seatsAvailable,
    } = req.body;

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { distance, price } = calculatePrice(originCoords, destinationCoords);

    const newRide = await Ride.create({
      userId: user._id,
      userName: user.name,
      userNumber: user.phoneNumber,
      userImage: user.image || "",
      origin,
      destination,
      originCoords,
      destinationCoords,
      time,
      seatsAvailable,
      distance,
      price,
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
