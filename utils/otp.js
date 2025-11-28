import dotenv from "dotenv";

dotenv.config();

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
