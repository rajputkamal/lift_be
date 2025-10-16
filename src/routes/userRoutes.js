import express from "express";
import { updateProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// PUT /api/user/update
router.put("/update", protect, updateProfile);

export default router;
