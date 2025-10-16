import User from "../models/userModel.js";

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // from token
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name;
    await user.save();

    res.status(200).json({
      message: "Profile updated successfully",
      user: { name: user.name, number: user.number },
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile", error });
  }
};
