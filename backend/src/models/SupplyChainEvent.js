import mongoose from "mongoose";

const EVENT_TYPES = ["Harvested", "Stored", "Transported", "Delivered", "QualityChecked", "Listed", "Sold"];

const supplyChainEventSchema = new mongoose.Schema({
  cropId: { type: String, required: true },
  batchId: { type: String, required: true },
  eventType: { type: String, enum: EVENT_TYPES, required: true },
  timestamp: { type: Date, default: Date.now },
  txHash: { type: String, default: "" },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  walletAddress: { type: String, default: "" },
  location: { type: String, default: "" },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

supplyChainEventSchema.index({ cropId: 1, timestamp: 1 });
supplyChainEventSchema.index({ batchId: 1 });

export default mongoose.model("SupplyChainEvent", supplyChainEventSchema);
export { EVENT_TYPES };
