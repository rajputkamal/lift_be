import express from "express";
import { createOrder } from "../controllers/orderController.js";

const router = express.Router();

// Create a new order (payload supports analytics fields per item)
router.post("/orders", createOrder);

export default router;
