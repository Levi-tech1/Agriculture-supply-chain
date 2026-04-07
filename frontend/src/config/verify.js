/**
 * Verify base URL for QR codes (must be HTTPS or LAN IP for iPhone scan).
 * Set VITE_VERIFY_BASE_URL in .env (e.g. https://xxxx.ngrok.io or http://192.168.1.5:5173).
 */
export function getVerifyBaseUrl() {
  const env = (import.meta.env.VITE_VERIFY_BASE_URL || "").replace(/\/$/, "");
  if (typeof window !== "undefined" && window.location?.origin) {
    return env || window.location.origin;
  }
  return env || "";
}

/** True when QR links would use localhost – iPhone cannot open these. User must set VITE_VERIFY_BASE_URL. */
export function isVerifyBaseLocalhost() {
  const base = getVerifyBaseUrl();
  if (!base) return true;
  try {
    const u = new URL(base);
    const host = (u.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return true;
  }
}

/** Full URL for batch verification – one QR per batch. */
export function getVerifyBatchUrl(batchId) {
  const base = getVerifyBaseUrl();
  if (!base || batchId == null || String(batchId).trim() === "") return "";
  return `${base}/verify/batch/${encodeURIComponent(String(batchId).trim())}`;
}

/** Normalize wallet to 0x + 40 hex for verification URL. */
function normalizeWallet(walletAddress) {
  const s = String(walletAddress).trim().replace(/^0x/, "").toLowerCase();
  if (!s) return "";
  const hex = s.padStart(40, "0").slice(-40);
  return "0x" + hex;
}

/** Full URL for user verification – one QR per user (by wallet). */
export function getVerifyUserUrl(walletAddress) {
  const base = getVerifyBaseUrl();
  if (!base || !walletAddress || String(walletAddress).trim() === "") return "";
  const normalized = normalizeWallet(walletAddress);
  if (!normalized) return "";
  return `${base}/verify/user/${encodeURIComponent(normalized)}`;
}
