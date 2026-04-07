/**
 * Vercel serverless catch-all entry for the backend.
 *
 * This ensures routes like /api/users/me correctly reach the Express app.
 * (Using only api/index.js + a blanket rewrite drops the original path and causes 404s.)
 */
import app from "../src/app.js";

export default app;

