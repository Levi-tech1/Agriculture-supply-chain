import { Router } from "express";
import QRCode from "qrcode";
import { readBatch, readTransfers, readActor, STAGES } from "../config/blockchain.js";
import Crop from "../models/Crop.js";
import User from "../models/User.js";
import Batch from "../models/Batch.js";

const router = Router();
// QR codes are consumed by mobile browsers; they must use a reachable public/LAN URL.
// Prefer backend-friendly env vars, but also accept the frontend's VITE_ naming for convenience.
const BASE_URL =
  process.env.VERIFY_BASE_URL ||
  process.env.VITE_VERIFY_BASE_URL ||
  process.env.FRONTEND_URL ||
  process.env.BASE_URL ||
  "http://localhost:5173";
const API_BASE_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || BASE_URL.replace(/\/$/, "");

// Map blockchain stages to requested status format
const STAGE_TO_STATUS = {
  Created: "HARVESTED",
  QualityChecked: "HARVESTED", // Still considered harvested after quality check
  InStorage: "STORED",
  InTransit: "TRANSPORTED",
  Delivered: "DELIVERED",
  Sold: "SOLD",
};

const STAGE_LABELS = {
  Created: "Harvest registered",
  QualityChecked: "Quality inspection",
  InStorage: "Storage",
  InTransit: "Transport",
  Delivered: "Market delivery",
  Sold: "Sold",
};

// Public: user verification by wallet (no login) – for QR scan
// GET /api/verify/user/:walletAddress
router.get("/user/:walletAddress", async (req, res, next) => {
  try {
    const raw = (req.params.walletAddress || "").trim();
    let wallet = raw.startsWith("0x") ? raw.toLowerCase() : "0x" + raw.toLowerCase();
    const hex = wallet.replace(/^0x/, "");
    if (hex.length > 40 || !/^[0-9a-f]*$/.test(hex)) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }
    const normalized = "0x" + hex.padStart(40, "0");
    const user = await User.findOne({ walletAddress: normalized }).select("-password").lean();
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({
      name: user.name,
      role: user.role,
      walletAddress: user.walletAddress,
      kycStatus: user.kycStatus || "pending",
      verificationStatus: user.verificationStatus || "unverified",
    });
  } catch (err) {
    next(err);
  }
});

// Public: QR code image for crop verification (consumer scan)
// Supports both human-readable batch ID (AGRI-2025-001) and hex ID (0x...)
router.get("/:batchId/qr", async (req, res, next) => {
  try {
    const batchId = req.params.batchId.trim();
    // Generate verification URL - link to the frontend page (shows the verification UI).
    // Using the backend JSON endpoint here would make mobile browsers display raw JSON instead.
    const verifyUrl = `${BASE_URL.replace(/\/$/, "")}/verify/batch/${encodeURIComponent(batchId)}`;
    const png = await QRCode.toBuffer(verifyUrl, { type: "png", width: 256, margin: 2 });
    res.set("Content-Type", "image/png");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(png);
  } catch (err) {
    next(err);
  }
});

// Public: QR verification endpoint - returns exact format as specified
// Supports AGRI-XXX (DB-only), AGRI-YYYY-XXX (Crop), and hex ID (0x...)
router.get("/:batchId", async (req, res, next) => {
  try {
    let batchIdParam = req.params.batchId.trim();
    let blockchainBatchId = null;
    let humanReadableBatchId = null;
    let cropData = null;

    // DB-only batch: AGRI-001, AGRI-002, ...
    if (batchIdParam.match(/^AGRI-\d+$/i)) {
      const dbBatch = await Batch.findOne({ batchId: batchIdParam.toUpperCase() })
        .populate("createdBy", "name location")
        .lean();
      if (!dbBatch) return res.status(404).json({ error: "Batch not found" });
      const harvestDate = dbBatch.harvestDate
        ? new Date(dbBatch.harvestDate).toISOString().slice(0, 10)
        : "—";
      return res.json({
        batchId: dbBatch.batchId,
        cropType: dbBatch.cropName || "—",
        farmName: dbBatch.createdBy?.name || "—",
        farmerName: dbBatch.createdBy?.name || "—",
        location: dbBatch.farmLocation || dbBatch.createdBy?.location || "—",
        quantity: dbBatch.quantityKg != null ? `${dbBatch.quantityKg} kg` : "—",
        harvestDate,
        currentStatus: dbBatch.status || "Created",
        supplyChainHistory: [{ status: dbBatch.status || "Created", timestamp: harvestDate, actor: "Farmer" }],
        blockchainVerified: false,
      });
    }

    // Check if it's a human-readable batch ID (AGRI-YYYY-XXX)
    if (batchIdParam.match(/^AGRI-\d{4}-\d{3}$/)) {
      humanReadableBatchId = batchIdParam;
      // Find crop by human-readable ID
      cropData = await Crop.findOne({ humanReadableBatchId: batchIdParam }).lean();
      if (!cropData) {
        return res.status(404).json({ error: "Batch not found" });
      }
      blockchainBatchId = cropData.batchId;
    } else {
      // Assume it's a hex batch ID
      blockchainBatchId = batchIdParam.startsWith("0x") ? batchIdParam : "0x" + batchIdParam;
      if (blockchainBatchId.length !== 66) {
        return res.status(400).json({ error: "Invalid batch ID format" });
      }
      // Try to find crop data
      cropData = await Crop.findOne({ batchId: blockchainBatchId }).lean();
      if (cropData && cropData.humanReadableBatchId) {
        humanReadableBatchId = cropData.humanReadableBatchId;
      }
    }

    // Read batch from blockchain
    const batch = await readBatch(blockchainBatchId);
    const transfers = await readTransfers(blockchainBatchId);
    const farmer = await readActor(batch.farmerAddress);

    // Get farmer's name (farm name) - prefer from User model, fallback to blockchain
    let farmName = farmer.name || "Unknown Farm";
    if (cropData) {
      const farmerUser = await User.findOne({ walletAddress: batch.farmerAddress.toLowerCase() }).lean();
      if (farmerUser && farmerUser.name) {
        farmName = farmerUser.name;
      }
      if (cropData.farmName) {
        farmName = cropData.farmName;
      }
    }

    // Format harvest date as YYYY-MM-DD
    const harvestDate = batch.harvestDate
      ? new Date(batch.harvestDate * 1000).toISOString().slice(0, 10)
      : null;

    // Map current stage to status
    const currentStatus = STAGE_TO_STATUS[batch.stageName] || "HARVESTED";

    // Build supply chain history
    const supplyChainHistory = [];
    
    // Add HARVESTED status from batch creation
    if (batch.createdAt) {
      supplyChainHistory.push({
        status: "HARVESTED",
        timestamp: harvestDate || new Date(batch.createdAt * 1000).toISOString().slice(0, 10),
        actor: "Farmer",
      });
    }

    // Add other statuses from transfers
    for (const transfer of transfers) {
      const status = STAGE_TO_STATUS[transfer.stageName];
      if (status && status !== "HARVESTED") {
        // Get actor name
        let actorName = "Unknown";
        try {
          const actor = await readActor(transfer.to);
          actorName = actor.roleName || "Unknown";
        } catch (e) {
          // Use role from stage if available
          actorName = transfer.stageName === "QualityChecked" ? "Inspector" :
                     transfer.stageName === "InStorage" ? "Distributor" :
                     transfer.stageName === "InTransit" ? "Distributor" :
                     transfer.stageName === "Delivered" ? "Retailer" :
                     transfer.stageName === "Sold" ? "Buyer" : "Unknown";
        }
        
        const transferDate = transfer.timestamp
          ? new Date(transfer.timestamp * 1000).toISOString().slice(0, 10)
          : null;
        
        // Avoid duplicates
        const existing = supplyChainHistory.find(
          (h) => h.status === status && h.timestamp === transferDate
        );
        if (!existing && transferDate) {
          supplyChainHistory.push({
            status,
            timestamp: transferDate,
            actor: actorName,
          });
        }
      }
    }

    // Sort by timestamp
    supplyChainHistory.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // Verify blockchain data matches
    let blockchainVerified = true;
    if (cropData) {
      // Verify crop type matches
      const typeMatch = (cropData.cropType || "").trim() === (batch.cropType || "").trim();
      const qtyMatch = String(cropData.quantityKg || "") === String(batch.quantityKg || "");
      const harvestMatch = cropData.harvestDate
        ? new Date(cropData.harvestDate).toISOString().slice(0, 10) === harvestDate
        : true;
      blockchainVerified = typeMatch && qtyMatch && harvestMatch;
    }

    // Return exact format as specified
    const quantityStr = batch.quantityKg != null ? `${batch.quantityKg} kg` : (cropData?.quantityKg != null ? `${cropData.quantityKg} kg` : "—");
    const response = {
      batchId: humanReadableBatchId || blockchainBatchId,
      cropType: batch.cropType || cropData?.cropType || "Unknown",
      farmName: farmName,
      farmerName: farmName,
      location: batch.farmLocation || cropData?.farmLocation || farmer.location || "Unknown",
      quantity: quantityStr,
      harvestDate: harvestDate || "Unknown",
      currentStatus: currentStatus,
      supplyChainHistory: supplyChainHistory.length > 0 ? supplyChainHistory : [
        {
          status: "HARVESTED",
          timestamp: harvestDate || new Date().toISOString().slice(0, 10),
          actor: "Farmer",
        },
      ],
      blockchainVerified: blockchainVerified,
    };

    res.json(response);
  } catch (err) {
    if (err.message === "Invalid batch ID" || err.message?.includes("Batch does not exist")) {
      return res.status(404).json({ error: "Batch not found" });
    }
    next(err);
  }
});

export default router;
