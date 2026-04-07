import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API } from "../config/api.js";
import styles from "./Subscription.module.css";

export default function Subscription() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [billing, setBilling] = useState({ stripeEnabled: false, checkoutPlans: {} });
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadPlans = useCallback(async () => {
    const res = await fetch(`${API}/subscriptions/plans`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.plans) {
      setPlans(data.plans);
      if (data.billing) setBilling(data.billing);
    }
  }, []);

  const loadMe = useCallback(async () => {
    const res = await fetch(`${API}/subscriptions/me`);
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setDetail(data);
      if (data.billing) setBilling(data.billing);
    }
  }, []);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;
    if (checkout === "success") {
      setSuccess("Payment received. Your subscription will update in a moment.");
      void refreshUser().then(() => loadMe());
    } else if (checkout === "cancel") {
      setError("Checkout was cancelled. No charge was made.");
    }
    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("session_id");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, refreshUser, loadMe]);

  useEffect(() => {
    if (!authLoading && !user) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await loadPlans();
        await loadMe();
      } catch (e) {
        setError(e.message || "Failed to load subscription data");
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, loadPlans, loadMe]);

  const startCheckout = async (planId) => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/subscriptions/create-checkout-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start checkout");
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const selectPlan = async (planId) => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/subscriptions/select-plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.code === "STRIPE_CHECKOUT_REQUIRED") {
          await startCheckout(planId);
          return;
        }
        throw new Error(data.error || data.errors?.[0]?.msg || "Could not update plan");
      }
      setSuccess(data.message || "Plan updated.");
      await refreshUser();
      await loadMe();
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelRenewal = async () => {
    setError("");
    setSuccess("");
    setActionLoading(true);
    try {
      const res = await fetch(`${API}/subscriptions/cancel-renewal`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not cancel renewal");
      setSuccess(data.message || "Renewal cancelled.");
      await refreshUser();
      await loadMe();
    } catch (e) {
      setError(e.message || "Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return <div className={styles.loading}>Loading subscription…</div>;
  }

  const effective = detail?.effectivePlan || user?.subscriptionPlan || "free";
  const maxB = detail?.limits?.maxBatches;
  const used = detail?.usage?.batchesCreated ?? 0;
  const endsAt = user?.subscriptionEndsAt
    ? new Date(user.subscriptionEndsAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  const stripeBilling = user?.subscriptionBilling === "stripe";

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Subscription</h1>
      <p className={styles.subtitle}>
        {billing.stripeEnabled
          ? "Pay securely with Stripe for Growth and Enterprise. Free stays on the app without a card."
          : "Paid plans run in demo mode until you add Stripe keys and price IDs on the server. No card is charged in demo mode."}
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <section className={styles.current} aria-labelledby="current-plan-heading">
        <div className={styles.currentRow}>
          <p id="current-plan-heading" className={styles.currentLabel}>
            Effective plan
          </p>
          <p className={styles.planName}>
            {(effective || "free").replace(/^./, (c) => c.toUpperCase())}
            {user?.subscriptionPlan && user.subscriptionPlan !== "free" && user.subscriptionCancelAtPeriodEnd && (
              <span className={styles.badge}>Cancels at period end</span>
            )}
            {stripeBilling && (
              <span className={styles.badge} title={user?.stripeSubscriptionStatus || ""}>
                Stripe
              </span>
            )}
          </p>
        </div>
        {user?.role === "farmer" && (
          <p className={styles.usage}>
            {maxB == null
              ? `Batches created: ${used} (unlimited on this plan)`
              : `Batches created: ${used} / ${maxB} on current plan limits`}
          </p>
        )}
        {endsAt && user?.subscriptionPlan !== "free" && (
          <p className={styles.usage}>Current period ends: {endsAt}</p>
        )}
        {detail?.note && <p className={styles.note}>{detail.note}</p>}
      </section>

      <div className={styles.grid}>
        {plans.map((p) => {
          const isCurrent = effective === p.id;
          const featured = p.id === "growth";
          const useCheckout = billing.stripeEnabled && billing.checkoutPlans?.[p.id];
          return (
            <article
              key={p.id}
              className={`${styles.card} ${featured ? styles.cardFeatured : ""}`}
            >
              <h2 className={styles.cardTitle}>
                {p.name}
                {isCurrent && <span className={styles.badge}>Current</span>}
              </h2>
              <p className={styles.price}>
                {p.priceMonthly === 0 ? "0" : p.priceMonthly}{" "}
                <span>{p.currency} / month</span>
              </p>
              <p className={styles.desc}>{p.description}</p>
              <ul className={styles.list}>
                {p.highlights?.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
              <div className={styles.actions}>
                {!isCurrent && p.priceMonthly === 0 && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={actionLoading}
                    onClick={() => selectPlan(p.id)}
                  >
                    Use Free
                  </button>
                )}
                {!isCurrent && p.priceMonthly > 0 && useCheckout && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={actionLoading}
                    onClick={() => startCheckout(p.id)}
                  >
                    Subscribe with card
                  </button>
                )}
                {!isCurrent && p.priceMonthly > 0 && !useCheckout && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnPrimary}`}
                    disabled={actionLoading}
                    onClick={() => selectPlan(p.id)}
                  >
                    Select {p.name} (demo)
                  </button>
                )}
                {isCurrent && p.id !== "free" && !user?.subscriptionCancelAtPeriodEnd && (
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnDanger}`}
                    disabled={actionLoading}
                    onClick={cancelRenewal}
                  >
                    Cancel renewal (keep access until period end)
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className={styles.note} style={{ marginTop: "1.5rem" }}>
        <Link to="/">← Back to dashboard</Link>
      </p>
    </div>
  );
}
