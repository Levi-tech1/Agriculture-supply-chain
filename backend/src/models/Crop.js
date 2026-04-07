import mongoose from "mongoose";

const cropSchema = new mongoose.Schema({
  cropId: { type: String, required: true, unique: true },
  batchId: { type: String, required: true }, // blockchain hex ID
  humanReadableBatchId: { type: String, unique: true, sparse: true }, // e.g. AGRI-2025-001
  cropType: { type: String, required: true },
  quantityKg: { type: Number, required: true },
  harvestDate: { type: Date, required: true },
  farmLocation: { type: String, default: "" },
  farmName: { type: String, default: "" }, // Farmer's farm name
  geoLocation: { type: String, default: "" },
  transactionHash: { type: String, default: "" },
  metadataHash: { type: String, default: "" }, // IPFS or hash of metadata
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  walletAddress: { type: String, required: true },
  paymentTxHash: { type: String, default: "" },
  paymentReleasedAt: { type: Date, default: null },
  qualityGrade: { type: String, default: "" },
  qrCodeUrl: { type: String, default: "" }, // Public verification URL
}, { timestamps: true });

cropSchema.index({ batchId: 1 });
cropSchema.index({ createdBy: 1 });

export default mongoose.model("Crop", cropSchema);
