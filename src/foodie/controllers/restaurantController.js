import mongoose from "mongoose";

import { generateFoodieToken } from "../../../utils/generateToken.js";
import Restaurant from "../models/restaurantModel.js";
import RestaurantCategory from "../models/restaurantCategoryModel.js";
import Category from "../models/categoryModel.js";
import MenuItem from "../models/menuItemModel.js";

export async function getAllRestaurants(_, res) {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });

    res.status(200).json({
      message: "Restaurants fetched successfully",
      count: restaurants.length,
      data: restaurants,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export async function createRestaurant(req, res) {
  try {
    const data = req.body;

    const existing = await Restaurant.findOne({ slug: data.email });

    if (existing) {
      return res.status(409).json({
        message: "Restaurant with this email already exists",
      });
    }

    const newRestaurant = {
      name: data.name,
      logoUrl: data.logoUrl,
      address: data.address,
      email: data.email,
      phone: data.phone,
      vegType: data.vegType,
    };

    const restaurant = await Restaurant.create(newRestaurant);
    const token = generateFoodieToken(
      restaurant._id,
      data.name,
      data.email,
      data.phone,
    );

    res.status(201).json({
      message: "Restaurant created successfully",
      token,
      data: restaurant,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Internal server error",
    });
  }
}

export const getRestaurantDetails = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { table } = req.query;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurantId" });
    }

    const restaurant = await Restaurant.findById(restaurantId).lean();

    if (!restaurant || !restaurant.isActive) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    // const relations = await RestaurantCategory.find({
    //   _id: restaurantId,
    // });

    const relations = await RestaurantCategory.find({
      restaurantId: restaurantId,
    }).lean();

    const categoryIds = relations.map((r) => r.categoryId);

    const categories = await Category.find({
      _id: { $in: categoryIds },
    })
      .select("_id name")
      .lean();

    res.json({
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        logo: restaurant.logoUrl,
        address: restaurant.address,
        phone: restaurant.phone,
        vegType: restaurant.vegType,
      },
      table: table || null,
      categories,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMenuItemsByCategory = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { categoryId } = req.params;

    const items = await MenuItem.find({
      restaurantId,
      categoryId,
      isAvailable: true,
    }).lean();

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const attachCategories = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { categoryIds } = req.body;

    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({
        message: "categoryIds must be a non-empty array",
      });
    }

    const restId = new mongoose.Types.ObjectId(restaurantId);

    const operations = categoryIds.map((id) => {
      const catId = new mongoose.Types.ObjectId(id);

      return {
        updateOne: {
          filter: {
            restaurantId: restId,
            categoryId: catId,
          },
          update: {
            $setOnInsert: {
              restaurantId: restId,
              categoryId: catId,
            },
          },
          upsert: true,
        },
      };
    });

    const result = await RestaurantCategory.bulkWrite(operations);

    res.status(201).json({
      message: "Categories attached successfully",
      insertedCount: result.upsertedCount,
      data: result,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Failed to attach categories",
    });
  }
};
