import express from "express";
import {
  createMenuItem,
  searchMenuItems,
} from "../controllers/menuItemController.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/v1/menu-items", protect, createMenuItem);
router.get("/v1/menu-items/search", protect, searchMenuItems);

export default router;
