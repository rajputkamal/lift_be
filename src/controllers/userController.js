import User from "../models/userModel.js";
import { Ride } from "../models/rideModel.js";

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, vehicleNumber } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "Name cannot be empty" });
      }
      user.name = name.trim();
    }

    if (vehicleNumber !== undefined) {
      user.vehicleNumber = vehicleNumber
        ? vehicleNumber.trim().toUpperCase()
        : null;
    }

    await user.save();
    await Ride.updateMany(
      { userId: user._id },
      {
        $set: {
          userName: user.name,
          vehicleNumber: user.vehicleNumber,
        },
      }
    );

    res.status(200).json({
      message: "Profile updated successfully",
      user: {
        name: user.name,
        phoneNumber: user.phoneNumber,
        vehicleNumber: user.vehicleNumber,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Error updating profile", error });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId).select("-__v");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};
