import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    subscriber: {
      // user who subscribes
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    channel: {
      // 'subscriber' subscribing to user's channel
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
