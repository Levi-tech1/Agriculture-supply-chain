/**
 * Seed sample crop batches into the database (Batch + Crop) for testing.
 * Run: node scripts/seedSampleBatches.js (from backend folder, with MONGODB_URI set)
 * Creates a seed farmer user and Batch+Crop records from data/sample-batches.json.
 * Batch IDs are generated as hex (0x...) so they appear in GET /api/batches;
 * batch detail from chain will 404 for these unless you mock or skip chain read.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";
import User from "../src/models/User.js";
import Batch from "../src/models/Batch.js";
import Crop from "../src/models/Crop.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SEED_FARMER = {
  email: "farmer@sample.com",
  password: "SampleFarmer@123",
  walletAddress: "0x1111111111111111111111111111111111111111",
  role: "farmer",
  name: "Sample Farmer",
  location: "India",
  chainRole: 1,
};

function hexBatchId(seed) {
  return "0x" + crypto.createHash("sha256").update(seed).digest("hex");
}

async function main() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/agri-supply-chain";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const path = join(__dirname, "../data/sample-batches.json");
  const batches = JSON.parse(readFileSync(path, "utf-8"));

  let farmer = await User.findOne({ email: SEED_FARMER.email });
  if (!farmer) {
    farmer = await User.create(SEED_FARMER);
    console.log("Created seed farmer:", farmer.email);
  } else {
    console.log("Seed farmer exists:", farmer.email);
  }

  let created = 0;
  for (const b of batches) {
    const batchId = hexBatchId(b.batchId);
    const existing = await Batch.findOne({ batchId });
    if (existing) continue;
    await Batch.create({
      batchId,
      createdBy: farmer._id,
      walletAddress: farmer.walletAddress,
    });
    await Crop.create({
      cropId: batchId,
      batchId,
      cropType: b.cropName,
      quantityKg: b.quantityKg,
      harvestDate: new Date(b.harvestDate),
      farmLocation: b.farmLocation,
      createdBy: farmer._id,
      walletAddress: farmer.walletAddress,
    });
    created++;
  }
  console.log("Seeded", created, "sample batches (Batch + Crop). Total sample entries:", batches.length);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
