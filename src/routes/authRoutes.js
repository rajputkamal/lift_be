import express from "express";

import { sendOtp, verifyOtp, validate } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.get("/me", protect, validate);

export default router;
