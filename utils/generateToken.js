import jwt from "jsonwebtoken";

export const generateToken = (userId, phoneNumber) => {
  return jwt.sign({ userId, phoneNumber }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};
