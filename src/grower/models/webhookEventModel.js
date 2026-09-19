import mongoose from "mongoose";
const schema = new mongoose.Schema({
  eventId: { type: String, required: true, unique: true },
  processedAt: { type: Date, default: Date.now },
});
export default mongoose.model("GrowerWebhookEvent", schema);
