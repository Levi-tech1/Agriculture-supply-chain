import { Router } from "express";
import User from "../models/User.js";
import { attachSessionUser, requireAdmin } from "../middleware/auth.js";

const router = Router();

router.use(attachSessionUser);

router.get("/users", requireAdmin, async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 }).lean();
    console.log("[admin] GET /api/admin/users – returning", users.length, "users");
    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("[admin] GET /api/admin/users error:", err.message);
    res.status(500).json({ success: false, error: "Failed to load users", users: [] });
  }
});

export default router;
