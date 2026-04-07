import validator from "validator";

/**
 * Canonical email for auth (matches validator.normalizeEmail defaults used by express-validator).
 */
export function normalizeAuthEmail(input) {
  const s = (input ?? "").toString().trim();
  if (!s) return "";
  if (!s.includes("@")) return s.toLowerCase();
  const n = validator.normalizeEmail(s);
  return (n || s).toLowerCase();
}

export function sanitizeLoginPassword(input) {
  return String(input ?? "").trim();
}
