import User from "./models/User.js";
import { normalizeAuthEmail, sanitizeLoginPassword } from "./utils/authIdentity.js";

/**
 * Create owner (admin) account from env if OWNER_EMAIL and OWNER_PASSWORD are set
 * and no user with that email exists. Owner can then log in via the login page.
 */
export async function seedOwner() {
  const emailRaw = process.env.OWNER_EMAIL?.trim();
  const email = normalizeAuthEmail(emailRaw || "");
  const password = sanitizeLoginPassword(process.env.OWNER_PASSWORD);
  const name = (process.env.OWNER_NAME || "Owner").trim();
  const wallet = (process.env.OWNER_WALLET || "0x0000000000000000000000000000000000000001").toLowerCase();

  if (!email || !password) {
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === "admin") {
      console.log("Owner (admin) already exists:", email);
    } else {
      console.log("User with OWNER_EMAIL already exists with role:", existing.role, "- not overwriting.");
    }
    return;
  }

  try {
    await User.create({
      email,
      password,
      walletAddress: wallet,
      role: "admin",
      name: name || "Owner",
      location: "",
      kycStatus: "verified",
      verificationStatus: "verified",
    });
    console.log("Owner (admin) account created for:", email);
  } catch (err) {
    console.error("Owner seed failed (server will still start):", err.message);
  }
}
