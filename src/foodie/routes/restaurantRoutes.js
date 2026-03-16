import express from "express";

import {
  createRestaurant,
  attachCategories,
  getRestaurantDetails,
  getMenuItemsByCategory,
  getAllRestaurants
} from "../controllers/restaurantController.js";
import { protect } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.get("/restaurants", getAllRestaurants);
router.post("/v1/restaurants", createRestaurant);
router.post(
  "/v1/restaurants/:restaurantId/categories",
  protect,
  attachCategories,
);

router.get("/v1/restaurants/:restaurantId", getRestaurantDetails);
router.get("/v1/restaurants/:restaurantId/:categoryId", getMenuItemsByCategory);

export default router;
