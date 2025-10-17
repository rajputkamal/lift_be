import express from "express";

import { postRide, getAllRides } from "../controllers/ridesController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, postRide);
router.get("/", protect, getAllRides);

export default router;
