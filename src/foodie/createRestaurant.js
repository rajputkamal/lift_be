import fs from "fs";

import connectDB from "../config/db.js";

import Restaurant from "./models/restaurantModel.js";
import Category from "./models/categoryModel.js";
import RestaurantCategory from "./models/restaurantCategoryModel.js";
import MenuItem from "./models/menuItemModel.js";

const RESTAURANT_DATA = JSON.parse(
  fs.readFileSync("./src/foodie/data/restaurant.json", "utf8"),
);

const CATEGORIES = JSON.parse(
  fs.readFileSync("./src/foodie/data/categories.json", "utf8"),
);

const MENU_DATA = JSON.parse(
  fs.readFileSync("./src/foodie/data/menu-items.json", "utf8"),
);

async function createOrUpdateRestaurant() {
  let restaurant = await Restaurant.findOne({
    email: RESTAURANT_DATA.email,
  });

  if (restaurant) {
    restaurant = await Restaurant.findByIdAndUpdate(
      restaurant._id,
      RESTAURANT_DATA,
      {
        new: true,
      },
    );

    console.log(`♻️ Restaurant Updated: ${restaurant.name}`);
  } else {
    restaurant = await Restaurant.create(RESTAURANT_DATA);

    console.log(`✅ Restaurant Created: ${restaurant.name}`);
  }

  return restaurant;
}

async function createCategories(restaurant) {
  console.log("\n📂 Creating Categories...\n");

  for (const categoryData of CATEGORIES) {
    let category = await Category.findOne({
      name: categoryData.name,
    });

    if (!category) {
      category = await Category.create({
        name: categoryData.name,
      });

      console.log(`✅ Category Created: ${category.name}`);
    } else {
      console.log(`♻️ Category Exists: ${category.name}`);
    }

    const mapping = await RestaurantCategory.findOne({
      restaurantId: restaurant._id,
      categoryId: category._id,
    });

    if (!mapping) {
      await RestaurantCategory.create({
        restaurantId: restaurant._id,
        categoryId: category._id,
      });

      console.log(`🔗 Linked: ${category.name}`);
    }
  }
}

async function createMenuItems(restaurant) {
  console.log("\n🍽️ Creating Menu Items...\n");

  let created = 0;
  let updated = 0;

  for (const categoryBlock of MENU_DATA) {
    const category = await Category.findOne({
      name: categoryBlock.categoryName,
    });

    if (!category) {
      console.log(`❌ Category Missing: ${categoryBlock.categoryName}`);

      continue;
    }

    console.log(
      `\n📂 ${categoryBlock.categoryName} (${categoryBlock.items.length} items)\n`,
    );

    for (const item of categoryBlock.items) {
      const payload = {
        restaurantId: restaurant._id,

        categoryId: category._id,

        name: item.name,

        description: item.description || "",

        price: item.price,

        vegType: item.vegType || "veg",

        tags: item.tags || [],

        isAvailable: item.isAvailable === undefined ? true : item.isAvailable,
      };

      const existingItem = await MenuItem.findOne({
        restaurantId: restaurant._id,
        categoryId: category._id,
        name: item.name,
      });

      if (existingItem) {
        await MenuItem.findByIdAndUpdate(existingItem._id, payload);

        updated++;

        console.log(`♻️ Updated: ${item.name}`);
      } else {
        await MenuItem.create(payload);

        created++;

        console.log(`✅ Created: ${item.name}`);
      }
    }
  }

  console.log("\n========================");
  console.log(`✅ Menu Created : ${created}`);
  console.log(`♻️ Menu Updated : ${updated}`);
  console.log("========================\n");
}

async function seed() {
  try {
    console.log("\n🚀 Connecting Database...\n");

    await connectDB();

    console.log("✅ Database Connected\n");

    const restaurant = await createOrUpdateRestaurant();

    await createCategories(restaurant);

    await createMenuItems(restaurant);

    console.log("\n=================================");
    console.log("🎉 ONBOARDING COMPLETED");
    console.log("=================================");
    console.log("Restaurant :", restaurant.name);
    console.log("Restaurant ID :", restaurant._id.toString());
    console.log("=================================\n");

    process.exit(0);
  } catch (error) {
    console.error(error);

    process.exit(1);
  }
}

seed();
