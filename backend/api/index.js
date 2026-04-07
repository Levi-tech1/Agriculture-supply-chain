/**
 * Vercel serverless entry: mounts the Express app for the whole deployment.
 * Without this, backend/src/index.js skips listen() when VERCEL=1 and nothing serves /api/*.
 *
 * Set MONGODB_URI, FRONTEND_URL (your frontend Vercel URL), etc. on this backend project.
 */
import app from "../src/app.js";

export default app;
