import { getStripe } from "../config/stripe.js";
import User from "../models/User.js";

async function applySubscriptionToUser(userId, plan, customerId, subscriptionId, subObject) {
  const active = subObject.status === "active" || subObject.status === "trialing";
  if (!active) return;
  await User.findByIdAndUpdate(userId, {
    stripeCustomerId: typeof customerId === "string" ? customerId : customerId?.id || customerId,
    stripeSubscriptionId: subscriptionId,
    stripeSubscriptionStatus: subObject.status,
    subscriptionPlan: plan,
    subscriptionEndsAt: new Date(subObject.current_period_end * 1000),
    subscriptionCancelAtPeriodEnd: !!subObject.cancel_at_period_end,
  });
}

async function syncFromStripeSubscription(sub) {
  const user =
    (sub.metadata?.userId && (await User.findById(sub.metadata.userId))) ||
    (await User.findOne({ stripeSubscriptionId: sub.id }));
  if (!user) return;

  const plan = (sub.metadata?.plan || user.subscriptionPlan || "free").toLowerCase();
  const terminal = ["canceled", "unpaid", "incomplete_expired"].includes(sub.status);

  if (terminal) {
    await User.findByIdAndUpdate(user._id, {
      subscriptionPlan: "free",
      subscriptionEndsAt: null,
      stripeSubscriptionId: null,
      stripeSubscriptionStatus: sub.status,
      subscriptionCancelAtPeriodEnd: false,
    });
    return;
  }

  const paid = sub.status === "active" || sub.status === "trialing" || sub.status === "past_due";
  await User.findByIdAndUpdate(user._id, {
    stripeSubscriptionStatus: sub.status,
    subscriptionEndsAt: new Date(sub.current_period_end * 1000),
    subscriptionCancelAtPeriodEnd: !!sub.cancel_at_period_end,
    ...(paid && plan !== "free" ? { subscriptionPlan: plan } : {}),
  });
}

export async function stripeWebhookHandler(req, res) {
  const stripe = getStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !whSecret) {
    return res.status(503).send("Stripe webhook not configured");
  }

  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription") break;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const subId = session.subscription;
        if (!userId || !plan || !subId) break;
        const sub = await stripe.subscriptions.retrieve(subId);
        await applySubscriptionToUser(userId, plan, session.customer, subId, sub);
        break;
      }
      case "customer.subscription.updated": {
        await syncFromStripeSubscription(event.data.object);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await User.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            subscriptionPlan: "free",
            subscriptionEndsAt: null,
            stripeSubscriptionId: null,
            stripeSubscriptionStatus: "canceled",
            subscriptionCancelAtPeriodEnd: false,
          }
        );
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook]", event.type, err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }

  res.json({ received: true });
}
