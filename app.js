import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoute from "./src/routes/userRoutes.js";
import ridesRoutes from "./src/routes/ridesRoutes.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoute);
app.use("/api/ride", ridesRoutes);

export default app;
