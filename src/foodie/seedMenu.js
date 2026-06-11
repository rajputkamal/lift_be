import mongoose from "mongoose";

import Category from "./models/categoryModel.js";
import MenuItem from "./models/menuItemModel.js";
import connectDB from "../config/db.js";
import RestaurantCategory from "./models/restaurantCategoryModel.js";
import Order from "./models/orderModel.js";

const RESTAURANT_ID = "699193d0071f372082d92079";

const restaurantObjectId = new mongoose.Types.ObjectId(RESTAURANT_ID);

// Ensure DB is connected before seeding
// connectDB returns a promise
// We'll call it from inside `seed()` to await the connection.

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
  {
    name: "Non-Veg",
    items: [
      "Chicken Biryani",
      "Butter Chicken",
      "Chicken 65",
      "Mutton Rogan Josh",
      "Fish Fry",
      "Prawn Curry",
      "Chicken Korma",
      "Keema Paratha",
      "Chicken Manchurian",
      "Grilled Chicken",
    ],
  },
];

const getPrice = () => Math.floor(Math.random() * 200) + 20;

const seed = async () => {
  try {
    console.log("🌱 Seeding data...");

    await connectDB();

    await Category.deleteMany({});
    await MenuItem.deleteMany({});
    await RestaurantCategory.deleteMany({});

    // Note: we do NOT delete existing orders to avoid removing real data.
    // We'll insert demo orders below to populate analytics.

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

    console.log("✅ Menu data seeded successfully!");

    // Create demo orders to populate analytics
    const allItems = await MenuItem.find({
      restaurantId: restaurantObjectId,
    }).lean();
    if (allItems.length === 0) {
      console.log("No menu items found to create demo orders.");
      process.exit(0);
    }

    const getRandomItem = () =>
      allItems[Math.floor(Math.random() * allItems.length)];

    const demoOrders = [];
    const ORDERS_TO_CREATE = 120;

    for (let i = 0; i < ORDERS_TO_CREATE; i++) {
      const itemsCount = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const orderItems = [];

      for (let j = 0; j < itemsCount; j++) {
        const menu = getRandomItem();
        const quantity = Math.random() < 0.8 ? 1 : 2;
        const isUpsell = Math.random() < 0.3; // 30% of items are upsell

        let sourceItemId = null;
        if (isUpsell) {
          // 50% chance to link to another item in the same order if exists
          if (orderItems.length > 0 && Math.random() < 0.5) {
            sourceItemId =
              orderItems[Math.floor(Math.random() * orderItems.length)].itemId;
          } else {
            // otherwise link to a random item
            sourceItemId = getRandomItem()._id.toString();
          }
        }

        orderItems.push({
          itemId: menu._id.toString(),
          name: menu.name,
          quantity,
          price: menu.price,
          addedVia: isUpsell ? "upsell" : "chat",
          ...(sourceItemId ? { sourceItemId } : {}),
        });
      }

      const totalAmount = orderItems.reduce(
        (sum, it) => sum + it.price * it.quantity,
        0,
      );

      demoOrders.push({
        restaurantId: RESTAURANT_ID,
        sessionId: `demo-session-${i}-${Date.now()}`,
        items: orderItems,
        totalAmount,
      });
    }

    await Order.insertMany(demoOrders);

    console.log(`✅ Inserted ${demoOrders.length} demo orders for analytics.`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
