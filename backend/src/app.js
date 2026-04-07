import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { connectDB } from "./db.js";
import { seedOwner } from "./seedOwner.js";
import { seedSampleUsers } from "./seedSampleUsers.js";
import { seedEnvUser } from "./seedEnvUser.js";
import { ensureMinSessionUser } from "./ensureMinSessionUser.js";
import batchRoutes from "./routes/batches.js";
import actorRoutes from "./routes/actors.js";
import verifyRoutes from "./routes/verify.js";
import cropRoutes from "./routes/crops.js";
import supplyChainRoutes from "./routes/supplyChain.js";
import paymentRoutes from "./routes/payments.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import sampleBatchesRoutes from "./routes/sampleBatches.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import { stripeWebhookHandler } from "./routes/stripeWebhook.js";
import { errorHandler } from "./middleware/error.js";

let dbReady = null;

function ensureDb(req, res, next) {
  if (dbReady === null) {
    dbReady = connectDB()
      .then(() => seedOwner().catch((err) => console.warn("Seed owner failed:", err.message)))
      .then(() => seedSampleUsers().catch((err) => console.warn("Seed sample users failed:", err.message)))
      .then(() => seedEnvUser().catch((err) => console.warn("Seed env user failed:", err.message)))
      .then(() => ensureMinSessionUser());
  }
  dbReady.then(() => next()).catch((err) => {
    console.error("DB error:", err);
    res.status(503).json({ error: "Database unavailable. Ensure MONGODB_URI is set (e.g. on Vercel: Project Settings → Environment Variables)." });
  });
}

const app = express();
const PORT = process.env.PORT || 4000;

// Behind Vercel / reverse proxies: correct client IP for rate limiting and logs
if (process.env.VERCEL === "1" || process.env.TRUST_PROXY === "1") {
  app.set("trust proxy", 1);
}

app.use(morgan("combined"));

function corsOriginOption() {
  const raw = (process.env.FRONTEND_URL || "").trim();
  if (raw) {
    const list = raw.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length > 1) {
      return (origin, cb) => {
        if (!origin) return cb(null, true);
        cb(null, list.includes(origin));
      };
    }
    if (list.length === 1) return list[0];
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
}

app.use(cors({ origin: corsOriginOption(), credentials: true }));

app.get("/health", (_, res) => res.json({ ok: true }));
// Same-origin Vercel proxy uses /api/*, so expose a health endpoint there too.
app.get("/api/health", (_, res) => res.json({ ok: true }));

app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  ensureDb,
  stripeWebhookHandler
);

app.use(express.json({ limit: "1mb" }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests" },
});
app.use("/api", limiter);

app.use(ensureDb);

app.use("/api/batches", batchRoutes);
app.use("/api/actors", actorRoutes);
app.use("/api/verify", verifyRoutes);
app.use("/api/crops", cropRoutes);
app.use("/api/supply-chain", supplyChainRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/sample-batches", sampleBatchesRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

app.use(errorHandler);

export default app;
export { PORT };
