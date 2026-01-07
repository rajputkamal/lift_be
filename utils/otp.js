import dotenv from "dotenv";
import { getCachedMcToken, setCachedMcToken } from "./mcAuthCache.js";

dotenv.config();

const MESSAGE_CENTRAL_BASE_URL = "https://cpaas.messagecentral.com";
const COUNTRY_CODE = 91;

const generateMessageCentralAuthToken = async () => {
  const token = getCachedMcToken();
  if (token) {
    return token;
  }

  const response = await fetch(`
  ${MESSAGE_CENTRAL_BASE_URL}/auth/v1/
authentication/token?customerId=${process.env.MESSAGE_CENTRAL_CUSTOMER_ID}&key=${process.env.MESSAGE_CENTRAL_BASE64_KEY}&scope=NEW&country=${COUNTRY_CODE}`);

  const data = await response.json();
  if (data.token) {
    setCachedMcToken(data.token);
    return data.token;
  }
};

export const sendMessageCentralOtp = async (phoneNumber) => {
  const authToken = await generateMessageCentralAuthToken();
  const response = await fetch(
    `${MESSAGE_CENTRAL_BASE_URL}/verification/v3/send?countryCode=${COUNTRY_CODE}&flowType=SMS&mobileNumber=${phoneNumber}`,
    {
      method: "POST",
      headers: {
        authToken,
        accept: "*/*",
      },
    }
  );

  const data = await response.json();
  return data;
};

export const validateMessageCentralOtp = async (
  phoneNumber,
  otp,
  verificationId
) => {
  const authToken = getCachedMcToken();
  const response = await fetch(
    `${MESSAGE_CENTRAL_BASE_URL}/verification/v3/validateOtp?countryCode=${COUNTRY_CODE}&mobileNumber=${phoneNumber}&verificationId=${verificationId}&customerId=${process.env.MESSAGE_CENTRAL_CUSTOMER_ID}&code=${otp}`,
    {
      headers: {
        authToken,
        accept: "*/*",
      },
    }
  );

  const data = await response.json();
  return data;
};
