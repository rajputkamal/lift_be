import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoute from "./src/routes/userRoutes.js";
import ridesRoutes from "./src/routes/ridesRoutes.js";

// FoodieAI APIs Routes
import restaurantRoutes from "./src/foodie/routes/restaurantRoutes.js";
import categoryRoutes from "./src/foodie/routes/categoryRoutes.js";
import menuItemRoutes from "./src/foodie/routes/menuItemRoutes.js";
import orderRoutes from "./src/foodie/routes/orderRoutes.js";
import analyticsRoutes from "./src/foodie/routes/analyticsRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoute);
app.use("/api/ride", ridesRoutes);

// FoodieAI APIs
app.use("/api/foodie", restaurantRoutes);
app.use("/api/foodie", categoryRoutes);
app.use("/api/foodie", menuItemRoutes);
app.use("/api/foodie", orderRoutes);
app.use("/api/foodie", analyticsRoutes);

export default app;
