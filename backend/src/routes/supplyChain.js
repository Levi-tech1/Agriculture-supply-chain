import { Router } from "express";
import { body, validationResult } from "express-validator";
import SupplyChainEvent from "../models/SupplyChainEvent.js";
import Crop from "../models/Crop.js";
import { attachSessionUser, requireRole } from "../middleware/auth.js";
import { EVENT_TYPES } from "../models/SupplyChainEvent.js";

const router = Router();

function normalizeId(id) {
  const s = (id || "").trim();
  return s.startsWith("0x") ? s : "0x" + s;
}

router.post(
  "/event",
  attachSessionUser,
  requireRole("farmer", "transporter", "warehouse", "retailer", "distributor", "inspector", "admin"),
  [
    body("cropId").isString().notEmpty(),
    body("eventType").isIn(EVENT_TYPES),
    body("location").optional().trim(),
    body("txHash").optional().trim(),
    body("metadata").optional().isObject(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { cropId, eventType, location, txHash, metadata } = req.body;
      const id = normalizeId(cropId);
      if (id.length !== 66) return res.status(400).json({ error: "Invalid cropId" });
      const crop = await Crop.findOne({ cropId: id });
      if (!crop) return res.status(404).json({ error: "Crop not found" });
      const event = await SupplyChainEvent.create({
        cropId: id,
        batchId: id,
        eventType,
        location: location || "",
        txHash: txHash || "",
        actorId: req.user._id,
        walletAddress: req.user.walletAddress,
        metadata: metadata || {},
      });
      res.status(201).json({
        id: event._id,
        cropId: event.cropId,
        eventType: event.eventType,
        timestamp: event.timestamp,
        txHash: event.txHash,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
