import express from "express";

import {
  postRide,
  getAvailableRides,
  getMyRides,
  deleteRide,
  editRide,
} from "../controllers/ridesController.js";
import { protect } from "../middleware/authMiddleware.js";
import { completeRides } from "../cron/completeRides.js";

const router = express.Router();

router.get("/available", protect, getAvailableRides);
router.get("/my", protect, getMyRides);
router.post("/", protect, postRide);
router.delete("/", protect, deleteRide);
router.put("/", protect, editRide);

// api end-point to run cron job using GCP cloud scheduler
router.post("/cron-job/complete-rides", completeRides);

export default router;
