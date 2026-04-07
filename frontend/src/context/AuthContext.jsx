import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { API } from "../config/api.js";

const AuthContext = createContext(null);

async function fetchWithTimeout(url, init = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(t);
  }
}

async function describeApiHealth() {
  try {
    const health = await fetchWithTimeout(`${API}/health`, {}, 8000);
    const text = await health.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      /* not JSON */
    }
    if (health.ok) {
      return `API reachable (health ${health.status})`;
    }
    if (parsed?.error) {
      return `Health ${health.status}: ${parsed.error}`;
    }
    if (health.status === 404 && /^\s*</.test(text.trimStart())) {
      return "Health returned HTML (404) — /api is not hitting the serverless proxy, or BACKEND_URL points at this frontend.";
    }
    return `API health HTTP ${health.status}${text ? ` — ${text.slice(0, 200)}` : ""}`;
  } catch {
    return "API not reachable (network error)";
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);

  const refreshUser = useCallback(async () => {
    setSessionError(null);
    setApiStatus(null);
    try {
      const res = await fetchWithTimeout(`${API}/users/me`, {}, 12000);
      const text = await res.text();
      if (!res.ok) {
        let detail = `HTTP ${res.status}`;
        let j = null;
        try {
          j = text ? JSON.parse(text) : null;
        } catch {
          /* not JSON (often HTML from static hosting) */
        }
        if (j?.error) {
          detail = j.error;
        } else if (res.status === 404) {
          const looksHtml = /^\s*</.test(text.trimStart());
          detail = looksHtml
            ? "HTTP 404: the response was a web page, not JSON — BACKEND_URL on this frontend project is often set to this same site URL, or /api is not deployed. Set BACKEND_URL to your real API host (no /api suffix), redeploy; or set VITE_API_URL at build time to that API origin and rebuild (enable CORS + FRONTEND_URL on the API)."
            : "HTTP 404 — /api/users/me was not found. Check BACKEND_URL, VITE_API_URL, and that the backend exposes GET /api/users/me.";
        }
        setApiStatus(await describeApiHealth());
        setSessionError(detail);
        setUser(null);
        return null;
      }
      let u;
      try {
        u = JSON.parse(text);
      } catch {
        setSessionError("The API returned invalid JSON for /api/users/me.");
        setApiStatus(await describeApiHealth());
        setUser(null);
        return null;
      }
      setUser(u);
      return u;
    } catch (err) {
      const aborted = err?.name === "AbortError";
      setSessionError(
        aborted
          ? "API request timed out. On Vercel, verify BACKEND_URL is set and redeploy."
          : "Cannot reach the API (network error). Check BACKEND_URL or your connection."
      );
      setApiStatus(aborted ? "API not reachable (timeout)" : "API not reachable (network error)");
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const markRegisteredOnChain = useCallback(async () => {
    const res = await fetchWithTimeout(`${API}/users/me/registered-on-chain`, { method: "PATCH" }, 12000);
    if (res.ok) {
      const data = await res.json();
      setUser((prev) => (prev ? { ...prev, registeredOnChain: data.registeredOnChain } : prev));
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, sessionError, apiStatus, refreshUser, markRegisteredOnChain }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
