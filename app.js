import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import { corsOptions } from "./src/config/cors.js";
dotenv.config({ quiet: true });

export async function createApp({
  mode = process.env.SERVICE_MODE || "default",
} = {}) {
  if (!["default", "microgreens"].includes(mode))
    throw new Error("Invalid SERVICE_MODE");
  const app = express();
  app.locals.serviceMode = mode;
  app.locals.catalogueWritesEnabled =
    mode !== "microgreens" ||
    process.env.MICROGREENS_CATALOGUE_WRITES === "enabled";
  const { guestCookieName } = await import("./src/grower/checkout/guest.js");
  guestCookieName();
  if (mode === "microgreens")
    app.use((_req, res, next) => {
      res.set("Cache-Control", "private, no-store");
      next();
    });
  const prefix = process.env.MICROGREENS_API_PREFIX || "/v1";
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(prefix) || prefix.endsWith("/"))
    throw new Error("Invalid MICROGREENS_API_PREFIX");
  const { default: growerRoutes } = await import("./src/grower/routes.js");
  const { default: checkoutRoutes, razorpayWebhook } =
    await import("./src/grower/checkout/routes.js");
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", (_req, res) =>
    res
      .status(app.locals.ready ? 200 : 503)
      .json({ ready: !!app.locals.ready }),
  );
  if (mode === "default")
    app.use(
      "/uploads",
      express.static(path.join(process.cwd(), "src/foodie/uploads/logos")),
    );
  app.use(cors(corsOptions));
  app.post(
    "/api/grower-checkout/v1/webhooks/razorpay",
    express.raw({ type: "application/json", limit: "1mb" }),
    razorpayWebhook,
  );
  if (mode === "microgreens")
    app.post(
      `${prefix}/webhooks/razorpay`,
      express.raw({ type: "application/json", limit: "1mb" }),
      razorpayWebhook,
    );
  app.use(express.json());
  if (mode === "default") {
    const { default: authRoutes } = await import("./src/routes/authRoutes.js");
    const { default: userRoute } = await import("./src/routes/userRoutes.js");
    const { default: ridesRoutes } =
      await import("./src/routes/ridesRoutes.js");
    const { default: restaurantRoutes } =
      await import("./src/foodie/routes/restaurantRoutes.js");
    const { default: categoryRoutes } =
      await import("./src/foodie/routes/categoryRoutes.js");
    const { default: menuItemRoutes } =
      await import("./src/foodie/routes/menuItemRoutes.js");
    const { default: orderRoutes } =
      await import("./src/foodie/routes/orderRoutes.js");
    const { default: analyticsRoutes } =
      await import("./src/foodie/routes/analyticsRoutes.js");
    app.use("/api/auth", authRoutes);
    app.use("/api/user", userRoute);
    app.use("/api/ride", ridesRoutes);

    // FoodieAI APIs
    app.use("/api/foodie", restaurantRoutes);
    app.use("/api/foodie", categoryRoutes);
    app.use("/api/foodie", menuItemRoutes);
    app.use("/api/foodie", orderRoutes);
    app.use("/api/foodie", analyticsRoutes);
  }
  if (mode === "microgreens") {
    app.use(prefix, growerRoutes);
    app.use(prefix, checkoutRoutes);
  }
  app.use("/api/grower/v1", growerRoutes);
  app.use("/api/grower-checkout/v1", checkoutRoutes);

  return app;
}
export default await createApp();
