/**
 * Seed sample crop batches with human-readable batch IDs and QR codes
 * Run: node scripts/seedSampleCrops.js (from backend folder, with MONGODB_URI set)
 * 
 * Creates sample crops with:
 * - Human-readable batch IDs (AGRI-2025-001, etc.)
 * - QR codes with verification URLs
 * - Multiple crop types
 * - Various supply chain stages
 */

import "dotenv/config";
import mongoose from "mongoose";
import Crop from "../src/models/Crop.js";
import User from "../src/models/User.js";
import { connectDB } from "../src/db.js";
import { generateHumanReadableBatchId } from "../src/utils/batchId.js";

const API_BASE_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || "http://localhost:4001";

const SAMPLE_CROPS = [
  {
    cropType: "Tomato",
    quantityKg: 500,
    harvestDate: "2025-01-12",
    farmLocation: "Agra, India",
    farmName: "Green Valley Farm",
    geoLocation: "27.1767°N, 78.0081°E",
  },
  {
    cropType: "Wheat",
    quantityKg: 1200,
    harvestDate: "2025-01-15",
    farmLocation: "Punjab, India",
    farmName: "Golden Fields Farm",
    geoLocation: "30.7333°N, 76.7794°E",
  },
  {
    cropType: "Rice",
    quantityKg: 800,
    harvestDate: "2025-01-18",
    farmLocation: "West Bengal, India",
    farmName: "Misty Paddy Fields",
    geoLocation: "22.5448°N, 88.3426°E",
  },
  {
    cropType: "Potato",
    quantityKg: 600,
    harvestDate: "2025-01-20",
    farmLocation: "Himachal Pradesh, India",
    farmName: "Mountain Fresh Farm",
    geoLocation: "31.1048°N, 77.1734°E",
  },
  {
    cropType: "Corn",
    quantityKg: 900,
    harvestDate: "2025-01-22",
    farmLocation: "Maharashtra, India",
    farmName: "Sunshine Crops",
    geoLocation: "19.0760°N, 72.8777°E",
  },
  {
    cropType: "Soybean",
    quantityKg: 700,
    harvestDate: "2025-01-25",
    farmLocation: "Madhya Pradesh, India",
    farmName: "Organic Harvest Farm",
    geoLocation: "23.2599°N, 77.4126°E",
  },
];

async function seedSampleCrops() {
  try {
    await connectDB();
    console.log("Connected to database");

    // Find or create a sample farmer
    let farmer = await User.findOne({ email: "farmer@sample.com" });
    if (!farmer) {
      console.log("Creating sample farmer...");
      farmer = await User.create({
        email: "farmer@sample.com",
        password: "SampleFarmer@123",
        walletAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        role: "farmer",
        name: "Green Valley Farm",
        location: "Agra, India",
      });
      console.log("Created sample farmer:", farmer.email);
    } else {
      console.log("Using existing farmer:", farmer.email);
    }

    // Generate sample batch IDs (hex format - in real scenario these come from blockchain)
    const crypto = await import("crypto");
    function hexBatchId(seed) {
      return "0x" + crypto.createHash("sha256").update(seed).digest("hex");
    }

    let created = 0;
    for (const cropData of SAMPLE_CROPS) {
      const batchIdHex = hexBatchId(`${cropData.cropType}-${cropData.harvestDate}-${Date.now()}`);
      const harvestYear = new Date(cropData.harvestDate).getFullYear();
      const humanReadableBatchId = generateHumanReadableBatchId(harvestYear);
      
      // Check if already exists
      const existing = await Crop.findOne({ 
        $or: [
          { batchId: batchIdHex },
          { humanReadableBatchId }
        ]
      });
      
      if (existing) {
        console.log(`Skipping ${humanReadableBatchId} - already exists`);
        continue;
      }

      const qrCodeUrl = `${API_BASE_URL.replace(/\/$/, "")}/api/verify/${encodeURIComponent(humanReadableBatchId)}`;

      await Crop.create({
        cropId: batchIdHex,
        batchId: batchIdHex,
        humanReadableBatchId,
        cropType: cropData.cropType,
        quantityKg: cropData.quantityKg,
        harvestDate: new Date(cropData.harvestDate),
        farmLocation: cropData.farmLocation,
        farmName: cropData.farmName,
        geoLocation: cropData.geoLocation,
        transactionHash: `0x${crypto.randomBytes(32).toString("hex")}`,
        metadataHash: `0x${crypto.randomBytes(16).toString("hex")}`,
        qrCodeUrl,
        createdBy: farmer._id,
        walletAddress: farmer.walletAddress,
      });

      created++;
      console.log(`Created ${humanReadableBatchId} - ${cropData.cropType} from ${cropData.farmName}`);
    }

    console.log(`\nSeeded ${created} sample crops. Total sample entries: ${SAMPLE_CROPS.length}`);
    console.log("\nSample batch IDs:");
    const crops = await Crop.find({ createdBy: farmer._id }).sort({ createdAt: -1 }).limit(10).lean();
    crops.forEach((c) => {
      console.log(`  ${c.humanReadableBatchId || c.batchId} - ${c.cropType} (QR: ${c.qrCodeUrl})`);
    });

    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seedSampleCrops();
