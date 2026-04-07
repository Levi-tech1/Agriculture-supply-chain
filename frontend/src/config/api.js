/**
 * API base URL for backend requests.
 * - Development: relative "/api" (Vite proxy → backend).
 * - Production (Vercel): leave VITE_API_URL unset to use same-origin "/api".
 *   Set BACKEND_URL in Vercel (server env, not VITE_) to your Express origin, e.g. https://xxx.onrender.com
 *   with no /api suffix. Repo root deploy uses /api/[...path].js; Root Directory "frontend" uses frontend/api/[...path].js.
 *   Or set VITE_API_URL before build for direct API calls (enable CORS on the backend).
 */
export const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "") || "";
export const API = API_BASE ? `${API_BASE}/api` : "/api";
