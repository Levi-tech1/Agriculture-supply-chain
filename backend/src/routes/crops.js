import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import Crop from "../models/Crop.js";
import SupplyChainEvent from "../models/SupplyChainEvent.js";
import Batch from "../models/Batch.js";
import { attachSessionUser, requireRole } from "../middleware/auth.js";
import { readBatch, readTransfers } from "../config/blockchain.js";
import { generateHumanReadableBatchId } from "../utils/batchId.js";

const router = Router();

function normalizeId(id) {
  const s = (id || "").trim();
  return s.startsWith("0x") ? s : "0x" + s;
}

router.post(
  "/",
  attachSessionUser,
  requireRole("farmer"),
  [
    body("batchId").isString().notEmpty(),
    body("cropType").trim().notEmpty(),
    body("quantityKg").isFloat({ min: 0.01 }),
    body("harvestDate").isISO8601(),
    body("farmLocation").optional().trim(),
    body("farmName").optional().trim(),
    body("geoLocation").optional().trim(),
    body("transactionHash").optional().trim(),
    body("metadataHash").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { batchId, cropType, quantityKg, harvestDate, farmLocation, farmName, geoLocation, transactionHash, metadataHash } = req.body;
      const cropId = normalizeId(batchId);
      if (cropId.length !== 66) return res.status(400).json({ error: "Invalid batchId" });
      const existing = await Crop.findOne({ cropId });
      if (existing) return res.status(400).json({ error: "Crop already registered" });

      // Generate human-readable batch ID
      const harvestYear = new Date(harvestDate).getFullYear();
      let humanReadableBatchId = generateHumanReadableBatchId(harvestYear);
      
      // Ensure uniqueness - if exists, try again
      let attempts = 0;
      while (await Crop.findOne({ humanReadableBatchId }) && attempts < 10) {
        humanReadableBatchId = generateHumanReadableBatchId(harvestYear);
        attempts++;
      }

      // Generate QR code URL
      const API_BASE_URL = process.env.API_BASE_URL || process.env.BACKEND_URL || process.env.FRONTEND_URL || "http://localhost:4001";
      const qrCodeUrl = `${API_BASE_URL.replace(/\/$/, "")}/api/verify/${encodeURIComponent(humanReadableBatchId)}`;

      const crop = await Crop.create({
        cropId,
        batchId: cropId,
        humanReadableBatchId,
        cropType,
        quantityKg: Number(quantityKg),
        harvestDate: new Date(harvestDate),
        farmLocation: farmLocation || "",
        farmName: farmName || req.user.name || "",
        geoLocation: geoLocation || "",
        transactionHash: transactionHash || "",
        metadataHash: metadataHash || "",
        qrCodeUrl,
        createdBy: req.user._id,
        walletAddress: req.user.walletAddress,
      });
      
      await SupplyChainEvent.create({
        cropId,
        batchId: cropId,
        eventType: "Harvested",
        timestamp: new Date(harvestDate),
        actorId: req.user._id,
        walletAddress: req.user.walletAddress,
        location: farmLocation || "",
        txHash: transactionHash || "",
      });
      
      res.status(201).json({
        cropId: crop.cropId,
        batchId: crop.batchId,
        humanReadableBatchId: crop.humanReadableBatchId,
        cropType: crop.cropType,
        quantityKg: crop.quantityKg,
        harvestDate: crop.harvestDate,
        farmLocation: crop.farmLocation,
        farmName: crop.farmName,
        transactionHash: crop.transactionHash,
        metadataHash: crop.metadataHash,
        qrCodeUrl: crop.qrCodeUrl,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/",
  attachSessionUser,
  async (req, res, next) => {
    try {
      const filter = req.role === "farmer" ? { createdBy: req.user._id } : {};
      const crops = await Crop.find(filter).sort({ createdAt: -1 }).lean();
      res.json({ crops });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/:cropId/history",
  attachSessionUser,
  async (req, res, next) => {
    try {
      const cropId = normalizeId(req.params.cropId);
      if (cropId.length !== 66) return res.status(400).json({ error: "Invalid cropId" });
      const events = await SupplyChainEvent.find({ cropId }).sort({ timestamp: 1 }).lean();
      const chainTransfers = await readTransfers(cropId).catch(() => []);
      res.json({
        events,
        chainTransfers,
      });
    } catch (err) {
      if (err.message === "Invalid batch ID") return res.status(404).json({ error: "Crop not found" });
      next(err);
    }
  }
);

// Get QR code for a crop/batch (by human-readable ID or hex ID)
router.get("/:cropId/qr-code", async (req, res, next) => {
  try {
    const cropIdParam = req.params.cropId.trim();
    let crop = null;
    
    // Check if it's human-readable ID
    if (cropIdParam.match(/^AGRI-\d{4}-\d{3}$/)) {
      crop = await Crop.findOne({ humanReadableBatchId: cropIdParam }).lean();
    } else {
      const cropId = normalizeId(cropIdParam);
      if (cropId.length !== 66) return res.status(400).json({ error: "Invalid cropId" });
      crop = await Crop.findOne({ cropId }).lean();
    }
    
    if (!crop || !crop.qrCodeUrl) {
      return res.status(404).json({ error: "Crop not found or QR code not generated" });
    }
    
    res.json({
      batchId: crop.humanReadableBatchId || crop.batchId,
      qrCodeUrl: crop.qrCodeUrl,
      verificationUrl: crop.qrCodeUrl,
    });
  } catch (err) {
    next(err);
  }
});

router.get(
  "/:cropId",
  attachSessionUser,
  async (req, res, next) => {
    try {
      const cropId = normalizeId(req.params.cropId);
      if (cropId.length !== 66) return res.status(400).json({ error: "Invalid cropId" });
      const crop = await Crop.findOne({ cropId }).lean();
      if (crop) {
        const fromChain = await readBatch(cropId).catch(() => null);
        return res.json({ ...crop, fromChain });
      }
      const fromChain = await readBatch(cropId);
      res.json(fromChain);
    } catch (err) {
      if (err.message === "Invalid batch ID" || err.message?.includes("Batch does not exist")) {
        return res.status(404).json({ error: "Crop not found" });
      }
      next(err);
    }
  }
);

export default router;
