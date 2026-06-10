import express from "express";
import { getRestaurantAnalytics } from "../controllers/analyticsController.js";

const router = express.Router();

// GET /api/foodie/analytics/restaurants?restaurantId=...&limit=10
router.get("/analytics/restaurants", getRestaurantAnalytics);

export default router;
