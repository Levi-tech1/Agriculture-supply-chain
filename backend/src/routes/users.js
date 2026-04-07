import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import User from "../models/User.js";
import { attachSessionUser, requireAdmin, isMongoObjectIdString } from "../middleware/auth.js";
import { toPublicUser } from "../utils/userPublic.js";

const router = Router();
const ROLES = ["farmer", "transporter", "warehouse", "retailer", "consumer", "admin", "inspector", "buyer", "distributor"];

router.use(attachSessionUser);

router.get("/me", (req, res) => {
  res.json(toPublicUser(req.user));
});

router.patch("/me/registered-on-chain", async (req, res, next) => {
  try {
    const id = req.userId == null ? "" : String(req.userId).trim();
    if (!isMongoObjectIdString(id)) {
      return res.status(503).json({ error: "Invalid session user." });
    }
    let user;
    try {
      user = await User.findByIdAndUpdate(id, { registeredOnChain: true }, { new: true });
    } catch (err) {
      if (err?.name === "CastError") {
        return res.status(503).json({ error: "Invalid session user." });
      }
      throw err;
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ registeredOnChain: user.registeredOnChain });
  } catch (err) {
    next(err);
  }
});

router.patch(
  "/me",
  [
    body("name").optional().trim().notEmpty(),
    body("location").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.location !== undefined) updates.location = req.body.location;
      const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(toPublicUser(user));
    } catch (err) {
      next(err);
    }
  }
);

router.get("/", requireAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();
    console.log("[users] GET /api/users – returning", users.length, "users");
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("[users] GET /api/users error:", err.message);
    next(err);
  }
});

router.patch(
  "/:userId",
  requireAdmin,
  [
    param("userId").isMongoId(),
    body("name").optional().trim().notEmpty().withMessage("Name cannot be empty"),
    body("role").optional().isIn(ROLES),
    body("kycStatus").optional().isIn(["pending", "verified", "rejected"]),
    body("verificationStatus").optional().isIn(["unverified", "verified"]),
    body("location").optional().trim(),
    body("mobile").optional().trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { userId } = req.params;
      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name.trim();
      if (req.body.role !== undefined) updates.role = req.body.role;
      if (req.body.kycStatus !== undefined) updates.kycStatus = req.body.kycStatus;
      if (req.body.verificationStatus !== undefined) updates.verificationStatus = req.body.verificationStatus;
      if (req.body.location !== undefined) updates.location = req.body.location;
      if (req.body.mobile !== undefined) updates.mobile = req.body.mobile;
      const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password").lean();
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json(user);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
