import Stripe from "stripe";

let stripeSingleton = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key);
  }
  return stripeSingleton;
}

/** Webhook + prices can be added incrementally. */
export function isStripeConfigured() {
  return !!(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function getStripePriceId(plan) {
  if (plan === "growth") return process.env.STRIPE_PRICE_GROWTH?.trim() || null;
  if (plan === "enterprise") return process.env.STRIPE_PRICE_ENTERPRISE?.trim() || null;
  return null;
}

export function planHasCheckoutPrice(plan) {
  return plan === "growth" || plan === "enterprise" ? !!getStripePriceId(plan) : false;
}
