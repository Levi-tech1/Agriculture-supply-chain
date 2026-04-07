import { Router } from "express";
import { body, validationResult } from "express-validator";
import User from "../models/User.js";
import Batch from "../models/Batch.js";
import { attachSessionUser } from "../middleware/auth.js";
import { SUBSCRIPTION_PLANS, SUBSCRIPTION_PLAN_IDS } from "../config/subscriptionPlans.js";
import { effectiveSubscriptionPlan, maxBatchesForUser } from "../utils/subscription.js";
import { toPublicUser } from "../utils/userPublic.js";
import { getStripe, getStripePriceId, isStripeConfigured, planHasCheckoutPrice } from "../config/stripe.js";

const router = Router();

const DEMO_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function billingPayload() {
  const stripeOn = isStripeConfigured();
  return {
    stripeEnabled: stripeOn,
    checkoutPlans: {
      growth: stripeOn && planHasCheckoutPrice("growth"),
      enterprise: stripeOn && planHasCheckoutPrice("enterprise"),
    },
  };
}

router.get("/plans", (_req, res) => {
  const plans = SUBSCRIPTION_PLAN_IDS.map((id) => {
    const p = SUBSCRIPTION_PLANS[id];
    return {
      id: p.id,
      name: p.name,
      priceMonthly: p.priceMonthly,
      currency: p.currency,
      maxBatches: p.maxBatches,
      description: p.description,
      highlights: p.highlights,
    };
  });
  res.json({ plans, billing: billingPayload() });
});

router.get("/me", attachSessionUser, async (req, res, next) => {
  try {
    const user = req.user;
    const effective = effectiveSubscriptionPlan(user);
    const maxB = maxBatchesForUser(user);
    let batchCount = 0;
    if (user.role === "farmer") {
      batchCount = await Batch.countDocuments({ createdBy: user._id });
    }
    const stripeOn = isStripeConfigured();
    res.json({
      user: toPublicUser(user),
      effectivePlan: effective,
      limits: { maxBatches: maxB },
      usage: { batchesCreated: batchCount },
      billing: billingPayload(),
      note: stripeOn
        ? "Paid plans use Stripe Checkout. Webhooks must point to POST /api/webhooks/stripe."
        : "Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and price IDs to enable card billing. Until then, paid plans use demo mode (no charge).",
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/create-checkout-session",
  attachSessionUser,
  [body("plan").isIn(["growth", "enterprise"])],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const stripe = getStripe();
      if (!stripe || !isStripeConfigured()) {
        return res.status(503).json({ error: "Stripe is not configured on the server." });
      }
      const { plan } = req.body;
      const priceId = getStripePriceId(plan);
      if (!priceId) {
        return res.status(503).json({ error: `Missing STRIPE_PRICE_${plan.toUpperCase()} in environment.` });
      }

      const user = req.user;
      const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${base}/subscription?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/subscription?checkout=cancel`,
        client_reference_id: user._id.toString(),
        metadata: {
          userId: user._id.toString(),
          plan,
        },
        subscription_data: {
          metadata: {
            userId: user._id.toString(),
            plan,
          },
        },
        ...(user.stripeCustomerId
          ? { customer: user.stripeCustomerId }
          : { customer_email: user.email }),
      });

      res.json({ url: session.url });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  "/select-plan",
  attachSessionUser,
  [body("plan").isIn(SUBSCRIPTION_PLAN_IDS)],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { plan } = req.body;
      const user = req.user;
      const stripe = getStripe();

      if (plan !== "free" && isStripeConfigured() && planHasCheckoutPrice(plan)) {
        return res.status(400).json({
          error: "Use Stripe Checkout to subscribe with a card.",
          code: "STRIPE_CHECKOUT_REQUIRED",
        });
      }

      if (plan === "free") {
        if (user.stripeSubscriptionId && stripe) {
          try {
            await stripe.subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
          } catch (e) {
            console.warn("[subscriptions] Stripe cancel_at_period_end:", e.message);
          }
          const updated = await User.findByIdAndUpdate(
            req.userId,
            { subscriptionCancelAtPeriodEnd: true },
            { new: true }
          );
          if (!updated) return res.status(404).json({ error: "User not found" });
          return res.json({
            user: toPublicUser(updated),
            effectivePlan: effectiveSubscriptionPlan(updated),
            message: "Your subscription will end after the current billing period. You can also manage billing in Stripe.",
          });
        }
        const u = await User.findByIdAndUpdate(
          req.userId,
          {
            subscriptionPlan: "free",
            subscriptionEndsAt: null,
            subscriptionCancelAtPeriodEnd: false,
            stripeSubscriptionId: "",
            stripeSubscriptionStatus: "",
          },
          { new: true }
        );
        if (!u) return res.status(404).json({ error: "User not found" });
        return res.json({
          user: toPublicUser(u),
          effectivePlan: effectiveSubscriptionPlan(u),
          message: "You are on the Free plan.",
        });
      }

      const updates = { subscriptionCancelAtPeriodEnd: false };
      updates.subscriptionPlan = plan;
      updates.subscriptionEndsAt = new Date(Date.now() + DEMO_PERIOD_MS);
      const updatedUser = await User.findByIdAndUpdate(req.userId, updates, { new: true });
      if (!updatedUser) return res.status(404).json({ error: "User not found" });
      res.json({
        user: toPublicUser(updatedUser),
        effectivePlan: effectiveSubscriptionPlan(updatedUser),
        message: `${SUBSCRIPTION_PLANS[plan].name} plan active (demo: renews in 30 days).`,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/cancel-renewal", attachSessionUser, async (req, res, next) => {
  try {
    const user = req.user;
    const stripe = getStripe();

    if (user.stripeSubscriptionId && stripe) {
      try {
        await stripe.subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
      } catch (e) {
        return res.status(502).json({ error: e.message || "Stripe request failed" });
      }
      const updated = await User.findByIdAndUpdate(
        req.userId,
        { subscriptionCancelAtPeriodEnd: true },
        { new: true }
      );
      if (!updated) return res.status(404).json({ error: "User not found" });
      return res.json({
        user: toPublicUser(updated),
        message: "Renewal cancelled at period end. Access continues until the current period ends.",
      });
    }

    if (!user.subscriptionEndsAt || user.subscriptionPlan === "free") {
      return res.status(400).json({ error: "No active paid plan to cancel." });
    }
    const updated = await User.findByIdAndUpdate(
      req.userId,
      { subscriptionCancelAtPeriodEnd: true },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json({
      user: toPublicUser(updated),
      message: "Renewal cancelled. You keep paid limits until the current period ends.",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
