import NodeCache from "node-cache";

const otpCache = new NodeCache({ stdTTL: 180, checkperiod: 60 });

export function storeOtpInCache(phoneNumber, otp) {
  otpCache.set(phoneNumber, otp);
}

export function deleteOtpFromCache(phoneNumber) {
  otpCache.del(phoneNumber);
}

export function getOtpFromCache(phoneNumber) {
  return otpCache.get(phoneNumber);
}
