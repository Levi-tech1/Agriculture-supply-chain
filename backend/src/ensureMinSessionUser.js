import User from "./models/User.js";

const FALLBACK_EMAIL = "session-demo@agri-supply.app";

/**
 * If the database has no users after other seeds, create one farmer so
 * attachSessionUser and GET /users/me always work (e.g. fresh MongoDB Atlas on Vercel).
 */
export async function ensureMinSessionUser() {
  try {
    const count = await User.countDocuments();
    if (count > 0) return;
    const existing = await User.findOne({ email: FALLBACK_EMAIL });
    if (existing) return;
    await User.create({
      email: FALLBACK_EMAIL,
      password: `bootstrap-${Date.now()}`,
      name: "Demo farmer",
      role: "farmer",
      walletAddress: "0x0000000000000000000000000000000000000001",
      location: "",
      mobile: "",
      kycStatus: "verified",
      verificationStatus: "verified",
      chainRole: 1,
    });
    console.log("[seed] Created fallback session user (database was empty).");
  } catch (err) {
    console.warn("[seed] ensureMinSessionUser failed:", err.message);
  }
}
