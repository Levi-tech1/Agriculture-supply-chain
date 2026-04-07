import mongoose from "mongoose";

const batchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true }, // AGRI-001 or hex from chain
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  walletAddress: { type: String, default: "" },
  // Form-created batch fields
  cropName: { type: String, default: "" },
  quantityKg: { type: Number, default: 0 },
  harvestDate: { type: Date, default: null },
  farmLocation: { type: String, default: "" },
  notes: { type: String, default: "" },
  status: { type: String, default: "Created" }, // Created | Harvested | Distributed | Retail | Sold
}, { timestamps: true });

batchSchema.index({ createdBy: 1 });
batchSchema.index({ status: 1 });
batchSchema.index({ cropName: 1 });

export default mongoose.model("Batch", batchSchema);
