import User from "./models/User.js";
import { normalizeAuthEmail, sanitizeLoginPassword } from "./utils/authIdentity.js";

const ROLES = ["farmer", "transporter", "warehouse", "retailer", "consumer", "admin", "inspector", "buyer", "distributor"];
const roleToChain = { farmer: 1, buyer: 2, distributor: 3, retailer: 4, inspector: 5, transporter: 3, warehouse: 3, consumer: 2 };

/**
 * Optional: create one user from env (local/dev) so you can log in without using Register.
 * Set SEED_USER_EMAIL + SEED_USER_PASSWORD (min 6 chars) in backend/.env
 * Ignored in production unless ALLOW_USER_SEED=1
 */
export async function seedEnvUser() {
  const emailRaw = process.env.SEED_USER_EMAIL?.trim();
  const password = sanitizeLoginPassword(process.env.SEED_USER_PASSWORD || "");
  if (!emailRaw || password.length < 6) return;

  const production = process.env.NODE_ENV === "production";
  if (production && process.env.ALLOW_USER_SEED !== "1") {
    return;
  }

  const email = normalizeAuthEmail(emailRaw);
  if (!email || !email.includes("@")) return;

  const existing = await User.findOne({ email });
  if (existing) return;

  const name = (process.env.SEED_USER_NAME || "User").trim() || "User";
  let role = (process.env.SEED_USER_ROLE || "farmer").trim().toLowerCase();
  if (!ROLES.includes(role)) role = "farmer";
  if (role === "admin" && production) role = "farmer";

  await User.create({
    email,
    password,
    name,
    role,
    walletAddress: "",
    location: "",
    mobile: "",
    chainRole: roleToChain[role] ?? null,
  });
  console.log("Env user created (SEED_USER_EMAIL). Session user can be set with DEFAULT_USER_ID to this account’s id if needed.");
}
