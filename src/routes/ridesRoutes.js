import express from "express";

import {
  postRide,
  getAvailableRides,
  getMyRides,
  deleteRide,
  editRide,
} from "../controllers/ridesController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/available", protect, getAvailableRides);
router.get("/my", protect, getMyRides);
router.post("/", protect, postRide);
router.delete("/", protect, deleteRide);
router.put("/", protect, editRide);

export default router;
