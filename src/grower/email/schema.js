import mongoose from "mongoose";
export const notificationSchema = new mongoose.Schema(
  {
    eventKey: String,
    type: String,
    recipient: String,
    status: {
      type: String,
      enum: [
        "pending",
        "sending",
        "retry",
        "accepted",
        "suppressed",
        "review",
        "failed",
      ],
      required: true,
    },
    attempts: { type: Number, default: 0 },
    firstAttemptAt: Date,
    nextAttemptAt: Date,
    leaseUntil: Date,
    leaseToken: String,
    payload: mongoose.Schema.Types.Mixed,
    providerMessageId: String,
    acceptedAt: Date,
    lastError: String,
  },
  { _id: false },
);
