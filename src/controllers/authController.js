import Otp from "../models/otpModel.js";
import User from "../models/userModel.js";
import {generateToken} from "../../utils/generateToken.js";

// Helper to generate random 4-digit OTP
const generateOtpCode = () => Math.floor(1000 + Math.random() * 9000).toString();

// POST /api/auth/send-otp
export const sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: "Phone number is required" });

    const otp = generateOtpCode();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // expires in 2 mins

    await Otp.findOneAndUpdate(
      { phoneNumber },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    // For now, just return OTP in response (in production, send via SMS)
    res.status(200).json({ message: "OTP sent successfully", otp });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp)
      return res.status(400).json({ message: "Phone number and OTP are required" });

    const otpDoc = await Otp.findOne({ phoneNumber });
    if (!otpDoc) return res.status(400).json({ message: "OTP not found" });

    if (otpDoc.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (otpDoc.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    // Find or create user
    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({ phoneNumber });
    }

    // Delete OTP after successful verification
    await Otp.deleteOne({ phoneNumber });

    // Generate JWT token
    const token = generateToken(user._id);

    res.status(200).json({
      message: "OTP verified successfully",
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
