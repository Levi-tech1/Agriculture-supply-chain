import { Router } from "express";
import { body, validationResult } from "express-validator";
import Batch from "../models/Batch.js";
import { attachSessionUser, requireRole } from "../middleware/auth.js";
import { maxBatchesForUser } from "../utils/subscription.js";
import { readBatch } from "../config/blockchain.js";

const router = Router();

// Generate next AGRI-XXX (e.g. AGRI-001)
async function generateBatchId() {
  const docs = await Batch.find({ batchId: /^AGRI-\d+$/ }).sort({ batchId: -1 }).limit(1).lean();
  let nextNum = 1;
  if (docs.length > 0) {
    const m = docs[0].batchId.match(/^AGRI-(\d+)$/);
    if (m) nextNum = parseInt(m[1], 10) + 1;
  }
  return "AGRI-" + String(nextNum).padStart(3, "0");
}

// Public: all batches (read-only) – no auth required
router.get("/all", async (req, res, next) => {
  try {
    const farmerFilter = (req.query.farmer || "").toString().trim().toLowerCase();
    const cropFilter = (req.query.crop || "").toString().trim().toLowerCase();
    let batches = await Batch.find({})
      .sort({ createdAt: -1 })
      .populate("createdBy", "name email location")
      .lean();
    if (farmerFilter) {
      batches = batches.filter((b) => (b.createdBy?.name || "").toLowerCase().includes(farmerFilter));
    }
    if (cropFilter) {
      batches = batches.filter((b) => (b.cropName || "").toLowerCase().includes(cropFilter));
    }
    const list = batches.map((b) => ({
      batchId: b.batchId,
      cropName: b.cropName || "—",
      farmerName: b.createdBy?.name || "—",
      location: b.farmLocation || b.createdBy?.location || "—",
      quantityKg: b.quantityKg,
      harvestDate: b.harvestDate,
      status: b.status || "Created",
      createdAt: b.createdAt,
    }));
    res.json({ batches: list });
  } catch (err) {
    next(err);
  }
});

router.use(attachSessionUser);

// Avoid GET /:batchId treating "create" as a batch id (common mistaken navigation)
router.get("/create", (_req, res) => {
  res.status(405).setHeader("Allow", "POST").json({ error: "Use POST /api/batches/create with a JSON body to create a batch." });
});

// Farmer only: my batches
router.get("/my", requireRole("farmer"), async (req, res, next) => {
  try {
    const batches = await Batch.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ batches });
  } catch (err) {
    next(err);
  }
});

// Farmer only: create batch from form (AGRI-XXX, DB-only)
router.post(
  "/create",
  requireRole("farmer"),
  [
    body("cropName").isString().trim().notEmpty(),
    body("quantityKg").isFloat({ min: 0.1 }),
    body("harvestDate").isISO8601(),
    body("farmLocation").optional().trim(),
    body("notes").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const maxB = maxBatchesForUser(req.user);
      if (maxB != null) {
        const count = await Batch.countDocuments({ createdBy: req.user._id });
        if (count >= maxB) {
          return res.status(403).json({
            error: `Batch limit reached (${maxB}) for your subscription. Upgrade your plan on the Subscription page.`,
            code: "SUBSCRIPTION_BATCH_LIMIT",
            limits: { maxBatches: maxB },
          });
        }
      }
      const { cropName, quantityKg, harvestDate, farmLocation, notes } = req.body;
      const batchId = await generateBatchId();
      const batch = await Batch.create({
        batchId,
        createdBy: req.user._id,
        walletAddress: req.user.walletAddress || "",
        cropName: cropName.trim(),
        quantityKg: Number(quantityKg),
        harvestDate: new Date(harvestDate),
        farmLocation: (farmLocation || req.user.location || "").trim(),
        notes: (notes || "").trim(),
        status: "Created",
      });
      const populated = await Batch.findById(batch._id).populate("createdBy", "name email location").lean();
      res.status(201).json({
        batch: {
          ...populated,
          farmerName: populated.createdBy?.name,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/",
  [body("batchId").isString().notEmpty()],
  requireRole("farmer"),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const batchId = req.body.batchId.trim();
      const normalized = batchId.startsWith("0x") ? batchId : "0x" + batchId;
      const existing = await Batch.findOne({ batchId: normalized });
      if (existing) return res.status(400).json({ error: "Batch already registered" });
      const batch = await Batch.create({
        batchId: normalized,
        createdBy: req.user._id,
        walletAddress: req.user.walletAddress || "",
      });
      res.status(201).json({ batchId: batch.batchId, id: batch._id });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/", async (req, res, next) => {
  try {
    const filter = req.role === "farmer" ? { createdBy: req.user._id } : {};
    const batches = await Batch.find(filter).sort({ createdAt: -1 }).populate("createdBy", "name location").lean();
    res.json({ batches });
  } catch (err) {
    next(err);
  }
});

router.get("/:batchId", async (req, res, next) => {
  try {
    const batchId = req.params.batchId.trim();
    // AGRI-XXX format: return from DB only
    if (/^AGRI-\d+$/i.test(batchId)) {
      const batch = await Batch.findOne({ batchId: batchId.toUpperCase() })
        .populate("createdBy", "name email location")
        .lean();
      if (!batch) return res.status(404).json({ error: "Batch not found" });
      return res.json({
        batchId: batch.batchId,
        cropName: batch.cropName,
        quantityKg: batch.quantityKg,
        harvestDate: batch.harvestDate,
        farmLocation: batch.farmLocation,
        notes: batch.notes,
        status: batch.status,
        createdAt: batch.createdAt,
        farmerName: batch.createdBy?.name,
        farmerLocation: batch.createdBy?.location,
      });
    }
    const normalized = batchId.startsWith("0x") ? batchId : "0x" + batchId;
    const data = await readBatch(normalized);
    res.json(data);
  } catch (err) {
    if (err.message === "Invalid batch ID" || err.message?.includes("Batch does not exist")) {
      return res.status(404).json({ error: "Batch not found" });
    }
    next(err);
  }
});

export default router;
