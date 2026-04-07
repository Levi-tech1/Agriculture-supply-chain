import { Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

let cached = null;

function getSampleBatches() {
  if (cached) return cached;
  try {
    const path = join(__dirname, "../../data/sample-batches.json");
    const raw = readFileSync(path, "utf-8");
    cached = JSON.parse(raw);
    return cached;
  } catch (err) {
    console.error("Sample batches load failed:", err.message);
    return [];
  }
}

router.get("/", (req, res) => {
  const batches = getSampleBatches();
  res.json({ batches, count: batches.length });
});

export default router;
