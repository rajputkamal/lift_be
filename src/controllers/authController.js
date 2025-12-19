import jwt from "jsonwebtoken";

import User from "../models/userModel.js";
import { generateToken } from "../../utils/generateToken.js";
import { generateOtpCode, sendOtp2Factor } from "../../utils/otp.js";
import {
  storeOtpInCache,
  deleteOtpFromCache,
  getOtpFromCache,
} from "../../utils/otpCache.js";
import {
  TEST_PHONE_NUMBER,
  TEST_OTP,
  TEST_USER,
} from "../config/testAccount.js";

export const sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({ message: "Phone number is required" });

    // TEST NUMBER FLOW FOR TESTERS
    if (phoneNumber === TEST_PHONE_NUMBER) {
      storeOtpInCache(phoneNumber, TEST_OTP);

      return res.status(200).json({
        message: "OTP sent successfully",
      });
    }

    const otp = generateOtpCode();

    storeOtpInCache(phoneNumber, otp);

    const result = await sendOtp2Factor(phoneNumber, otp);

    if (!result || result.Status !== "Success") {
      res
        .status(500)
        .json({ message: "Failed to send OTP. Please try again." });
    }
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

    // TEST NUMBER FLOW FOR TESTERS
    if (phoneNumber === TEST_PHONE_NUMBER && otp === TEST_OTP) {
      const dummyToken = jwt.sign(
        {
          userId: "test-user-id",
          phoneNumber: TEST_PHONE_NUMBER,
          role: "tester",
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({
        message: "OTP verified successfully (test account)",
        token: dummyToken,
        user: {
          id: "test-user-id",
          name: TEST_USER.name,
          phoneNumber: TEST_USER.phoneNumber,
        },
      });
    }

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
