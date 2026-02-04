import mongoose from "mongoose";
import User from "../src/models/userModel.js";

const MONGO_URI = ""; // please add from .env file when there is need to run this file.
async function runMigration() {
  try {
    await mongoose.connect(MONGO_URI);

    const result = await User.updateMany(
      { rideSummary: { $exists: false } },
      {
        $set: {
          rideSummary: {
            activeRides: 0,
            completedRides: 0,
            totalRides: 0,
          },
        },
      },
    );

    console.log("✅ Migration done");
    console.log("Matched:", result.matchedCount);
    console.log("Updated:", result.modifiedCount);

    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed", err);
    process.exit(1);
  }
}

runMigration();
