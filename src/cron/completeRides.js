import moment from "moment-timezone";
import dotenv from "dotenv";

import { Ride } from "../models/rideModel.js";

dotenv.config();

export const completeRides = async (req, res) => {
  if (req.headers["x-cron-key"] !== process.env.CRON_KEY) {
    return res.status(403).send("Forbidden");
  }
  try {
    const now = moment().tz("Asia/Kolkata");

    const result = await Ride.updateMany(
      { status: "ACTIVE" },
      {
        $set: {
          status: "COMPLETED",
          cleanupAt: moment().tz("Asia/Kolkata").add(30, "days").toDate(),
        },
      },
    );

    console.log(
      `✅ ${result.modifiedCount} rides completed at ${now.format()}`,
    );
    return res.status(200).json({
      success: true,
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Error completing rides:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
