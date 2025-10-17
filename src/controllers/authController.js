import Otp from "../models/otpModel.js";
import User from "../models/userModel.js";
import { generateToken } from "../../utils/generateToken.js";

const generateOtpCode = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

export const sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({ message: "Phone number is required" });

    const otp = generateOtpCode();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // expires in 3 mins

    await Otp.findOneAndUpdate(
      { phoneNumber },
      { otp, expiresAt },
      { upsert: true, new: true }
    );

    //TODO::For now, just return OTP in response (in production, send via SMS)
    res.status(200).json({ message: "OTP sent successfully", otp });
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

    const otpDoc = await Otp.findOne({ phoneNumber });
    if (!otpDoc) return res.status(400).json({ message: "OTP not found" });

    if (otpDoc.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (otpDoc.expiresAt < new Date())
      return res.status(400).json({ message: "OTP expired" });

    let user = await User.findOne({ phoneNumber });
    if (!user) {
      user = await User.create({ phoneNumber });
    }

    await Otp.deleteOne({ phoneNumber });

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
