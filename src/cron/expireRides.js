import cron from "node-cron";
import moment from "moment-timezone";

import { Ride } from "../models/rideModel.js";

export const startExpireRidesCron = () => {
  // Runs every day at 12:00 AM IST
  cron.schedule(
    "0 0 * * *",
    async () => {
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
      } catch (error) {
        console.error("❌ Error completing rides:", error);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );
};
