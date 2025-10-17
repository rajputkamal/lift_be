import express from "express";

import { getProfile, updateProfile } from "../controllers/userController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.put("/update", protect, updateProfile);
router.get("/profile", protect, getProfile);

export default router;
