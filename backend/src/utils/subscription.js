import { SUBSCRIPTION_PLANS } from "../config/subscriptionPlans.js";

/** Paid plan past `subscriptionEndsAt` → treat as free for limits. */
export function effectiveSubscriptionPlan(user) {
  const plan = user.subscriptionPlan || "free";
  if (plan === "free") return "free";
  const end = user.subscriptionEndsAt;
  if (end && new Date(end).getTime() < Date.now()) return "free";
  return plan;
}

/** @returns {number | null} null = unlimited */
export function maxBatchesForUser(user) {
  if (user.role === "admin" || user.role === "owner") return null;
  const eff = effectiveSubscriptionPlan(user);
  return SUBSCRIPTION_PLANS[eff]?.maxBatches ?? SUBSCRIPTION_PLANS.free.maxBatches;
}
