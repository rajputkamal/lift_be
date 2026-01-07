import moment from "moment-timezone";
import mongoose from "mongoose";

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

    // Set expiry today's midnight
    const expiresAt = moment().tz("Asia/Kolkata").endOf("day").toDate();

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

export const deleteRide = async (req, res) => {
  try {
    const { rideId } = req.body;
    const userId = req.user.userId;

    if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid Ride ID" });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res
        .status(404)
        .json({ success: false, message: "Ride not found" });
    }

    if (ride.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to delete this ride",
      });
    }

    await Ride.findByIdAndDelete(rideId);

    res.status(200).json({
      success: true,
      message: "Ride deleted successfully",
    });
  } catch (error) {
    console.error("Delete ride error:", error);
    res.status(500).json({
      success: false,
      message: "Error while deleting ride.",
    });
  }
};

export const editRide = async (req, res) => {
  try {
    const {
      rideId,
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

    const userId = req.user.userId;

    if (!rideId || !mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid ride id",
      });
    }

    const updateData = {
      origin,
      destination,
      originCoords,
      destinationCoords,
      price,
      distance,
      time,
      seatsAvailable,
      vehicleType,
    };

    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key]
    );

    const updatedRide = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        userId,
      },
      { $set: updateData },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or not authorized",
      });
    }

    res.status(200).json({
      success: true,
      message: "Ride updated successfully",
      data: updatedRide,
    });
  } catch (error) {
    console.error("Edit ride error:", error);
    res.status(500).json({
      success: false,
      message: "Error while updating ride",
    });
  }
};
