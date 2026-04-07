import { Router } from "express";
import { body, validationResult } from "express-validator";
import Crop from "../models/Crop.js";
import { attachSessionUser, requireRole } from "../middleware/auth.js";

const router = Router();

function normalizeId(id) {
  const s = (id || "").trim();
  return s.startsWith("0x") ? s : "0x" + s;
}

router.post(
  "/release",
  attachSessionUser,
  requireRole("buyer", "consumer", "admin"),
  [
    body("cropId").isString().notEmpty(),
    body("txHash").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { cropId, txHash } = req.body;
      const id = normalizeId(cropId);
      if (id.length !== 66) return res.status(400).json({ error: "Invalid cropId" });
      const crop = await Crop.findOne({ cropId: id });
      if (crop) {
        if (crop.paymentReleasedAt) return res.status(400).json({ error: "Payment already released for this crop" });
        await Crop.updateOne(
          { cropId: id },
          { paymentTxHash: txHash || crop.paymentTxHash, paymentReleasedAt: new Date() }
        );
      }
      res.json({
        success: true,
        message: "Payment release recorded. Ensure the on-chain release was executed (e.g. from frontend).",
        cropId: id,
        txHash: txHash || null,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
