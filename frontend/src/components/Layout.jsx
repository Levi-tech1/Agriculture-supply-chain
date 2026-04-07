import { useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { EnhancementProvider, useEnhancement } from "../context/EnhancementContext";
import SimpleStaticBackground from "./SimpleStaticBackground";
import styles from "./Layout.module.css";

function LayoutShell() {
  const { user } = useAuth();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const { notifications, toasts, unreadCount, markAllRead, activeRole, setRole } = useEnhancement();

  const roleOptions = useMemo(() => ["admin", "farmer", "distributor"], []);

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  const closeNav = () => setNavOpen(false);

  return (
    <div className={styles.layout}>
      <SimpleStaticBackground />
      {navOpen && (
        <button
          type="button"
          className={styles.navBackdrop}
          aria-label="Close menu"
          onClick={closeNav}
        />
      )}
      <header className={`${styles.header} ${navOpen ? styles.headerMenuOpen : ""}`}>
        <div className={styles.headerRow}>
          <Link to="/" className={styles.logo} onClick={closeNav}>AgriChain</Link>
          <button
            type="button"
            className={styles.menuToggle}
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            aria-controls="main-nav"
            onClick={() => setNavOpen((o) => !o)}
          >
            <span className={styles.menuToggleBar} aria-hidden />
            <span className={styles.menuToggleBar} aria-hidden />
            <span className={styles.menuToggleBar} aria-hidden />
          </button>
          <nav id="main-nav" className={`${styles.nav} ${navOpen ? styles.navOpen : ""}`}>
            <Link to="/" onClick={closeNav}>Dashboard</Link>
            <Link to="/inventory" onClick={closeNav}>Inventory Management</Link>
            <Link to="/delivery-tracking" onClick={closeNav}>Order & Delivery Tracking</Link>
            <Link to="/data-analytics" onClick={closeNav}>Data Analytics Dashboard</Link>
            <Link to="/subscription" onClick={closeNav}>Subscription</Link>
            <Link to="/batches" onClick={closeNav}>Batches</Link>
            {user?.role === "farmer" && <Link to="/batches/create" onClick={closeNav}>Create crop</Link>}
            {(user?.role === "admin" || user?.role === "owner") && <Link to="/admin/users" onClick={closeNav}>Owner / Users</Link>}
          </nav>
          <div className={styles.user}>
            <div className={styles.roleSwitchWrap}>
              <label htmlFor="role-view" className={styles.roleSwitchLabel}>Role view</label>
              <select id="role-view" value={activeRole} onChange={(e) => setRole(e.target.value)} className={styles.roleSwitch}>
                {roleOptions.map((r) => (
                  <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className={styles.bellWrap}>
              <button
                type="button"
                className={styles.bell}
                aria-label="Notifications"
                onClick={() => {
                  setShowNotifications((prev) => !prev);
                  markAllRead();
                }}
              >
                🔔
                {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className={styles.notificationPanel}>
                  <div className={styles.notificationHeader}>
                    <strong>Notifications</strong>
                    <button type="button" className={styles.clearBtn} onClick={markAllRead}>Mark all read</button>
                  </div>
                  <div className={styles.notificationList}>
                    {notifications.length === 0 ? (
                      <p className={styles.notificationEmpty}>No alerts yet.</p>
                    ) : notifications.slice(0, 8).map((n) => (
                      <div key={n.id} className={styles.notificationItem}>
                        <p className={styles.notificationTitle}>{n.title}</p>
                        <p className={styles.notificationMsg}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <span className={styles.role}>
              {user?.role === "admin" ? "Owner" : user?.role}
              {(() => {
                const p = user?.subscriptionPlan;
                if (!p || p === "free") return null;
                const end = user?.subscriptionEndsAt ? new Date(user.subscriptionEndsAt).getTime() : null;
                if (end != null && end < Date.now()) return null;
                return (
                  <span className={styles.planPill} title="Subscription plan">
                    {p}
                  </span>
                );
              })()}
            </span>
            <span className={styles.wallet} title={user?.walletAddress || undefined}>
              {(() => {
                const w = (user?.walletAddress || "").trim();
                if (!w) return "No wallet";
                if (w.length <= 10) return w;
                return `${w.slice(0, 6)}…${w.slice(-4)}`;
              })()}
            </span>
          </div>
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.pageEnter}>
          <Outlet />
        </div>
      </main>
      <div className={styles.toastStack} aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={styles.toast}>
            <p className={styles.toastTitle}>{t.title}</p>
            <p className={styles.toastMessage}>{t.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, loading, sessionError, apiStatus, refreshUser } = useAuth();

  if (loading) {
    return (
      <div className={styles.layout}>
        <SimpleStaticBackground />
        <div className={styles.authLoading} role="status" aria-live="polite">
          Loading…
        </div>
      </div>
    );
  }
  if (!user) {
    const showVercelHint =
      typeof window !== "undefined" &&
      (window.location.hostname.includes("vercel.app") || window.location.hostname.includes("vercel.com"));
    return (
      <div className={styles.layout}>
        <SimpleStaticBackground />
        <div className={styles.authErrorWrap} role="alert">
          <div className={styles.authErrorCard}>
            <p className={styles.authErrorTitle}>Could not load a session user.</p>
            {sessionError ? (
              <p className={styles.authErrorDetail}>{sessionError}</p>
            ) : (
              <p className={styles.authErrorDetail}>
                Ensure the backend is running, <code>MONGODB_URI</code> is set on the API host, and the database has at
                least one user (or set <code>DEFAULT_USER_ID</code> on the server).
              </p>
            )}
            {apiStatus && (
              <p className={styles.authErrorStatus}>
                <strong>API status:</strong> {apiStatus}
              </p>
            )}
            <button type="button" className={styles.authErrorRetry} onClick={() => refreshUser()}>
              Retry
            </button>
            {showVercelHint && (
              <p className={styles.authErrorHint}>
                <strong>Vercel (this frontend project):</strong> In <strong>Settings → Environment Variables</strong>, set{" "}
                <code>BACKEND_URL</code> to your <strong>separate API</strong> base URL only — for example{" "}
                <code>https://your-api.onrender.com</code> or <code>https://your-backend-project.vercel.app</code>. Do{" "}
                <em>not</em> use this AgriChain frontend URL, and do not add <code>/api</code> at the end. Redeploy.
                Easiest alternative: set <code>VITE_API_URL</code> at build time to that same API origin, rebuild, and on
                the API set <code>FRONTEND_URL</code> to this site for CORS.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <EnhancementProvider userRole={user.role}>
      <LayoutShell />
    </EnhancementProvider>
  );
}
