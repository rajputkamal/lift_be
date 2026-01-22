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
    const cleanupAt = moment().tz("Asia/Kolkata").endOf("day").toDate();

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
      status: "ACTIVE",
      cleanupAt: null,
      // expiresAt,
    });

    await User.updateOne(
      { _id: user._id },
      {
        $inc: {
          "rideSummary.activeRides": 1,
          "rideSummary.totalRides": 1,
        },
      },
    );

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

// GET /rides/available?vehicleType=car
export const getAvailableRides = async (req, res) => {
  try {
    const { vehicleType } = req.query;
    const userId = req.user.userId;

    const filter = {
      status: "ACTIVE",
      userId: { $ne: userId },
    };

    if (vehicleType) {
      filter.vehicleType = vehicleType;
    }

    const rides = await Ride.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, rides });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch available rides" });
  }
};

// GET /rides/my?tab=active
// GET /rides/my?tab=completed
export const getMyRides = async (req, res) => {
  try {
    const { tab } = req.query;
    const userId = req.user.userId;

    let filter = { userId };

    if (tab === "active") {
      filter.status = "ACTIVE";
    }

    if (tab === "completed") {
      filter.status = "COMPLETED";
    }

    const rides = await Ride.find(filter).sort({ createdAt: -1 });

    res.json({ success: true, rides });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch my rides" });
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

    if (ride.status === "ACTIVE") {
      await User.updateOne(
        {
          _id: userId,
          "rideSummary.activeRides": { $gt: 0 },
        },
        {
          $inc: {
            "rideSummary.activeRides": -1,
          },
        },
      );
    }

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
      action,
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
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    if (action && action === "repost") {
      updateData.status = "ACTIVE";
      updateData.cleanupAt = null;
    }

    const updatedRide = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        userId,
      },
      { $set: updateData },
      { new: true },
    );

    if (!updatedRide) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or not authorized",
      });
    }

    res.status(200).json({
      success: true,
      message:
        action === "repost"
          ? "Ride reposted successfully"
          : "Ride updated successfully",
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
