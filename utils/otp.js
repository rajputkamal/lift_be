import dotenv from "dotenv";
import Twilio from "twilio";

dotenv.config();

const client = new Twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

//TODO:: Remove Twilio config once 2FACTOR setup is done.
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

export const generateOtpCode = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

export const sendOtp2Factor = async (phoneNumber, otp) => {
  // 2_FACTOR_URL = "https://2factor.in/API/V1/:api_key/SMS/:phone_number/:otp_value/:otp_template_name"

  const numberWithCountry = `+91${phoneNumber}`;

  try {
    const response = await fetch(
      `https://2factor.in/API/V1/${process.env.TWO_FACTOR_API_KEY}/SMS/${numberWithCountry}/${otp}/${process.env.TWO_FACTOR_TEMPLATE_NAME}`
    );

    const result = await response.json();
    return result;
  } catch (error) {
    console.error(
      "We are facing an error while sending OTP via 2Factor. Please try again.",
      error
    );
  }
};
