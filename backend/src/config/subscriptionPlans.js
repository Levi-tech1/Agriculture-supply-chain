/** @typedef {'free' | 'growth' | 'enterprise'} SubscriptionPlanId */

/** @type {Record<SubscriptionPlanId, { id: SubscriptionPlanId; name: string; priceMonthly: number; currency: string; maxBatches: number | null; description: string; highlights: string[] }>} */
export const SUBSCRIPTION_PLANS = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    currency: "USD",
    maxBatches: 10,
    description: "Get started with traceability and batch tracking.",
    highlights: ["Up to 10 crop batches", "QR verification", "Dashboard & batches view"],
  },
  growth: {
    id: "growth",
    name: "Growth",
    priceMonthly: 29,
    currency: "USD",
    maxBatches: 100,
    description: "For active farms and cooperatives.",
    highlights: ["Up to 100 batches", "Priority-style limits for scaling", "Same full chain tools"],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 99,
    currency: "USD",
    maxBatches: null,
    description: "Unlimited batches and highest caps.",
    highlights: ["Unlimited batches", "Suited for large operations", "All platform features"],
  },
};

export const SUBSCRIPTION_PLAN_IDS = Object.keys(SUBSCRIPTION_PLANS);
