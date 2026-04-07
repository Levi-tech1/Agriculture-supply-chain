/**
 * User-facing hint when /api/* returns 404 (no proxy) or similar misconfiguration.
 */
export function apiProxyMisconfiguredMessage(requestPath) {
  return (
    `Cannot reach the API (${requestPath}). ` +
    "Vercel: set environment variable BACKEND_URL to your Express server origin only (e.g. https://your-api.onrender.com — no /api at the end), then redeploy. " +
    "Use the repository root as the Vercel Root Directory, or deploy from this repo root so both /api and the frontend build are included. " +
    "Alternative: set VITE_API_URL to that same origin before building the frontend, then redeploy (ensure the backend allows CORS for your Vercel domain)."
  );
}
