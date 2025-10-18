import User from "../models/userModel.js";
import { generateToken } from "../../utils/generateToken.js";
import { sendOtpOnUserNumber } from "../../utils/otp.js";
import {
  storeOtpInCache,
  deleteOtpFromCache,
  getOtpFromCache,
} from "../../utils/otpCache.js";

const generateOtpCode = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

export const sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({ message: "Phone number is required" });

    const otp = generateOtpCode();

    storeOtpInCache(phoneNumber, otp);

    await sendOtpOnUserNumber(phoneNumber, otp);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;
    if (!phoneNumber || !otp)
      return res
        .status(400)
        .json({ message: "Phone number and OTP are required" });

    const cachedOtp = getOtpFromCache(phoneNumber);
    if (!cachedOtp) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    if (cachedOtp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    deleteOtpFromCache(phoneNumber);

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({ phoneNumber });
    }

    const token = generateToken(user._id, phoneNumber);

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
