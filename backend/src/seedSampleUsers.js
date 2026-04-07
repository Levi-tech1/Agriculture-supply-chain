import User from "./models/User.js";
import { normalizeAuthEmail } from "./utils/authIdentity.js";

/** Sample password for all seeded demo users (hashed by User pre-save) */
const SAMPLE_PASSWORD = "Sample@1";

/** 20 sample users for Owner – User Management (same data as frontend FALLBACK_USERS) */
const SAMPLE_USERS = [
  { email: "ramesh@example.com", name: "Ramesh Kumar", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x0000000000000000000000000000000000000001" },
  { email: "suresh@example.com", name: "Suresh Patel", role: "distributor", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000002" },
  { email: "neha@example.com", name: "Neha Sharma", role: "retailer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000003" },
  { email: "amit@example.com", name: "Amit Singh", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x0000000000000000000000000000000000000004" },
  { email: "pooja@example.com", name: "Pooja Verma", role: "consumer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000005" },
  { email: "rahul@example.com", name: "Rahul Mehta", role: "distributor", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000006" },
  { email: "anita@example.com", name: "Anita Gupta", role: "retailer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x0000000000000000000000000000000000000007" },
  { email: "vikram@example.com", name: "Vikram Rao", role: "farmer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000008" },
  { email: "sunita@example.com", name: "Sunita Joshi", role: "consumer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000009" },
  { email: "manoj@example.com", name: "Manoj Yadav", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x000000000000000000000000000000000000000a" },
  { email: "deepak@example.com", name: "Deepak Malhotra", role: "distributor", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x000000000000000000000000000000000000000b" },
  { email: "kavita@example.com", name: "Kavita Nair", role: "retailer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x000000000000000000000000000000000000000c" },
  { email: "rohit@example.com", name: "Rohit Bansal", role: "consumer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x000000000000000000000000000000000000000d" },
  { email: "sanjay@example.com", name: "Sanjay Mishra", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x000000000000000000000000000000000000000e" },
  { email: "priya@example.com", name: "Priya Kapoor", role: "retailer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x000000000000000000000000000000000000000f" },
  { email: "nikhil@example.com", name: "Nikhil Jain", role: "distributor", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000010" },
  { email: "seema@example.com", name: "Seema Arora", role: "consumer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000011" },
  { email: "arjun@example.com", name: "Arjun Khanna", role: "farmer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000012" },
  { email: "meena@example.com", name: "Meena Choudhary", role: "retailer", kycStatus: "verified", verificationStatus: "verified", walletAddress: "0x0000000000000000000000000000000000000013" },
  { email: "harsh@example.com", name: "Harsh Vardhan", role: "farmer", kycStatus: "pending", verificationStatus: "unverified", walletAddress: "0x0000000000000000000000000000000000000014" },
];

/**
 * Create sample users 1–20 if they don't exist. Does not create an admin (use OWNER_* env + seedOwner).
 */
export async function seedSampleUsers() {
  let created = 0;
  for (const row of SAMPLE_USERS) {
    const email = normalizeAuthEmail(row.email);
    const existing = await User.findOne({ email });
    if (existing) continue;
    const rawWallet = (row.walletAddress || "").replace(/^0x/, "").toLowerCase();
    const walletAddress = rawWallet ? "0x" + rawWallet.padStart(40, "0") : "";
    try {
      await User.create({
        email,
        password: SAMPLE_PASSWORD,
        name: row.name,
        role: row.role,
        walletAddress,
        location: "",
        mobile: "",
        kycStatus: row.kycStatus,
        verificationStatus: row.verificationStatus,
      });
      created++;
    } catch (err) {
      console.warn("Seed sample user failed:", email, err.message);
    }
  }
  if (created > 0) {
    console.log("Sample users seeded:", created, "new users (1–20).");
  }
}
