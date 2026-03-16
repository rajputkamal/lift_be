import express from "express";
import { createMenuItem } from "../controllers/menuItemController.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/v1/menu-items", protect, createMenuItem);

export default router;
    