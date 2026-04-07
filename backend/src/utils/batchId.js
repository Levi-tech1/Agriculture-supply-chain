/**
 * Generate human-readable batch ID in format: AGRI-YYYY-XXX
 * e.g. AGRI-2025-001, AGRI-2025-002, etc.
 */
export function generateHumanReadableBatchId(year = null) {
  const currentYear = year || new Date().getFullYear();
  // Generate a sequential number (in production, fetch from DB for uniqueness)
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const sequence = (timestamp % 10000) + random;
  const padded = String(sequence).padStart(3, "0");
  return `AGRI-${currentYear}-${padded}`;
}

/**
 * Generate batch ID from year and sequence number
 */
export async function generateBatchIdFromSequence(year, sequence) {
  const padded = String(sequence).padStart(3, "0");
  return `AGRI-${year}-${padded}`;
}
