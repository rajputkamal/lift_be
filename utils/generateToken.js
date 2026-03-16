import jwt from "jsonwebtoken";

export const generateToken = (userId, phoneNumber) => {
  return jwt.sign({ userId, phoneNumber }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

export const generateFoodieToken = (restaurantIdId, name, email, phone) => {
  return jwt.sign(
    { restaurantIdId, name, email, phone },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};
