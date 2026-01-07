import User from "../models/userModel.js";
import { generateToken } from "../../utils/generateToken.js";
import {
  sendMessageCentralOtp,
  validateMessageCentralOtp,
} from "../../utils/otp.js";
import {
  TEST_PHONE_NUMBER,
  TEST_OTP,
  TEST_USER_ID,
} from "../config/testAccount.js";

export const sendOtp = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber)
      return res.status(400).json({ message: "Phone number is required" });

    // TEST NUMBER FLOW FOR TESTERS
    if (phoneNumber === TEST_PHONE_NUMBER) {
      return res.status(200).json({
        message: "OTP sent successfully",
      });
    }

    const result = await sendMessageCentralOtp(phoneNumber);

    if (
      !result ||
      result.message !== "SUCCESS" ||
      result.responseCode !== 200
    ) {
      res
        .status(500)
        .json({ message: "Failed to send OTP. Please try again." });
    }
    res.status(200).json({
      message: "OTP sent successfully",
      verificationId: result.data.verificationId,
    });
  } catch (error) {
    console.error("Send OTP Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp, verificationId } = req.body;
    if (!phoneNumber || !otp)
      return res
        .status(400)
        .json({ message: "Phone number and OTP are required" });

    // TEST NUMBER FLOW FOR TESTERS
    if (phoneNumber === TEST_PHONE_NUMBER && otp === TEST_OTP) {
      let user = await User.findById(TEST_USER_ID);

      if (!user) {
        user = await User.create({
          _id: TEST_USER_ID,
          phoneNumber: TEST_PHONE_NUMBER,
          name: "John Doe",
        });
      }

      const token = generateToken(user._id, user.phoneNumber);

      return res.status(200).json({
        message: "OTP verified successfully (test account)",
        token,
        user: {
          id: user._id,
          phoneNumber: user.phoneNumber,
          name: user.name,
        },
      });
    }

    const result = await validateMessageCentralOtp(
      phoneNumber,
      otp,
      verificationId
    );

    if (!result || result.responseCode !== 200) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

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
