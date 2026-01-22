import mongoose from "mongoose";
import User from "../src/models/userModel.js";

const MONGO_URI =
  "mongodb+srv://liftapp_user:OkTLGazECpY0FPA3@cluster0.wif1jv4.mongodb.net/rides?retryWrites=true&w=majority&appName=Cluster0";

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
