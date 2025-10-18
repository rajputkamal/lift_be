import dotenv from "dotenv";
import Twilio from "twilio";

dotenv.config();

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export const sendOtpOnUserNumber = async (phoneNumber, otp) => {
  try {
    await client.messages.create({
      body: `Your verification code for LIFT RIDE sharing app is ${otp}. Please do not share with anyone. It is valid for 3 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${phoneNumber}`,
    });
  } catch (error) {
    console.error(
      "We are facing an error while sending OTP. Please try again.",
      error
    );
  }
};
