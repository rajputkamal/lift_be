import express from "express";

import {
  postRide,
  getAllRides,
  deleteRide,
  editRide,
} from "../controllers/ridesController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, postRide);
router.get("/", protect, getAllRides);
router.delete("/", protect, deleteRide);
router.put("/", protect, editRide);

export default router;
