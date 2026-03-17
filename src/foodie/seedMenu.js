import mongoose from "mongoose";

import Category from "./models/categoryModel.js";
import MenuItem from "./models/menuItemModel.js";
import connectDB from "../config/db.js";
import RestaurantCategory from "./models/restaurantCategoryModel.js";

const RESTAURANT_ID = "699193d0071f372082d92079";

const restaurantObjectId = new mongoose.Types.ObjectId(RESTAURANT_ID);

connectDB();

const data = [
  {
    name: "Cold Drinks",
    items: [
      "Mango Lassi",
      "Sweet Lime Soda",
      "Salted Lime Soda",
      "Masala Buttermilk",
      "Rose Milk",
      "Cold Coffee",
      "Chocolate Milkshake",
      "Strawberry Shake",
      "Tender Coconut",
      "Iced Tea",
    ],
  },
  {
    name: "Beverages",
    items: [
      "Masala Chai",
      "Filter Coffee",
      "Black Coffee",
      "Green Tea",
      "Ginger Tea",
      "Elaichi Tea",
      "Hot Chocolate",
      "Lemon Tea",
      "Turmeric Milk",
      "Badam Milk",
    ],
  },
  {
    name: "Starters",
    items: [
      "Paneer Tikka",
      "Veg Manchurian",
      "Gobi 65",
      "Chilli Paneer",
      "Spring Rolls",
      "Hara Bhara Kabab",
      "Aloo Tikki",
      "Corn Cheese Balls",
      "Veg Pakora",
      "Mushroom Fry",
    ],
  },
  {
    name: "Main Course",
    items: [
      "Paneer Butter Masala",
      "Kadai Paneer",
      "Dal Tadka",
      "Chole Masala",
      "Rajma",
      "Veg Korma",
      "Mix Veg Curry",
      "Palak Paneer",
      "Aloo Gobi",
      "Malai Kofta",
    ],
  },
  {
    name: "Rice",
    items: [
      "Veg Biryani",
      "Jeera Rice",
      "Fried Rice",
      "Curd Rice",
      "Lemon Rice",
      "Sambar Rice",
      "Tomato Rice",
      "Paneer Biryani",
      "Mushroom Biryani",
      "Veg Pulao",
    ],
  },
  {
    name: "Breads",
    items: [
      "Butter Naan",
      "Garlic Naan",
      "Tandoori Roti",
      "Plain Roti",
      "Lachha Paratha",
      "Aloo Paratha",
      "Paneer Paratha",
      "Kulcha",
      "Missi Roti",
      "Bhatura",
    ],
  },
  {
    name: "South Indian",
    items: [
      "Masala Dosa",
      "Plain Dosa",
      "Onion Dosa",
      "Rava Dosa",
      "Idli",
      "Vada",
      "Upma",
      "Pongal",
      "Set Dosa",
      "Uttapam",
    ],
  },
  {
    name: "Desserts",
    items: [
      "Gulab Jamun",
      "Rasgulla",
      "Kaju Katli",
      "Jalebi",
      "Rasmalai",
      "Gajar Halwa",
      "Ice Cream",
      "Kulfi",
      "Phirni",
      "Mysore Pak",
    ],
  },
  {
    name: "Snacks",
    items: [
      "Samosa",
      "Kachori",
      "Pav Bhaji",
      "Vada Pav",
      "Dabeli",
      "Bread Pakora",
      "Chaat",
      "Bhel Puri",
      "Sev Puri",
      "Pani Puri",
    ],
  },
  {
    name: "Combos",
    items: [
      "Mini Thali",
      "South Indian Combo",
      "North Indian Thali",
      "Paneer Combo",
      "Rice Combo",
      "Dosa Combo",
      "Lunch Combo",
      "Dinner Combo",
      "Snack Combo",
      "Family Combo",
    ],
  },
];

const getPrice = () => Math.floor(Math.random() * 200) + 20;

const seed = async () => {
  try {
    console.log("🌱 Seeding data...");

    await Category.deleteMany({});
    await MenuItem.deleteMany({});
    await RestaurantCategory.deleteMany({});

    for (const cat of data) {
      const category = await Category.create({ name: cat.name });

      await RestaurantCategory.create({
        restaurantId: restaurantObjectId,
        categoryId: category._id,
      });

      const items = cat.items.map((item) => ({
        restaurantId: restaurantObjectId,
        categoryId: category._id,
        name: item,
        description: `${item} - delicious Indian dish`,
        price: getPrice(),
        vegType: "veg",
        image: `https://source.unsplash.com/300x300/?${item}`,
      }));

      await MenuItem.insertMany(items);
    }

    console.log("✅ Data seeded successfully!");
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
