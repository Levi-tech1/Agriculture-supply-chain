import User from "../models/User.js";

/** 24-char hex MongoDB ObjectId string (avoids CastError and false positives from isValid). */
export function isMongoObjectIdString(value) {
  const s = value == null ? "" : String(value).trim();
  return /^[a-fA-F0-9]{24}$/.test(s);
}

/**
 * No login/JWT: attach the acting user from DEFAULT_USER_ID or the first suitable user in the DB.
 * Prefer farmer so supply-chain features work out of the box; then admin/owner; then any user.
 */
export async function attachSessionUser(req, res, next) {
  try {
    const rawId = process.env.DEFAULT_USER_ID == null ? "" : String(process.env.DEFAULT_USER_ID).trim();
    let user = null;
    if (rawId && isMongoObjectIdString(rawId)) {
      user = await User.findById(rawId).select("-password");
    }
    if (!user) {
      user = await User.findOne({ role: "farmer" }).sort({ createdAt: 1 }).select("-password");
    }
    if (!user) {
      user = await User.findOne({ role: { $in: ["admin", "owner"] } }).sort({ createdAt: 1 }).select("-password");
    }
    if (!user) {
      user = await User.findOne({}).sort({ createdAt: 1 }).select("-password");
    }
    if (!user) {
      return res.status(503).json({
        error:
          "No users in the database. Run the backend seed scripts or set DEFAULT_USER_ID to a valid user ObjectId.",
      });
    }
    req.userId = user._id.toString();
    req.walletAddress = user.walletAddress;
    req.role = user.role;
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.role)) {
      return res.status(403).json({ error: "Insufficient role" });
    }
    next();
  };
}

export function requireAdmin(req, res, next) {
  if (req.role !== "admin" && req.role !== "owner") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}
