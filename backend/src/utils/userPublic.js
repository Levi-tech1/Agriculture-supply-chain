/** Shape returned to the client (login, register, /users/me). */
export function toPublicUser(user) {
  const u = user.toObject ? user.toObject() : { ...user };
  delete u.password;
  const out = {
    id: u._id,
    email: u.email,
    walletAddress: u.walletAddress,
    role: u.role,
    name: u.name,
    location: u.location,
    mobile: u.mobile,
    registeredOnChain: u.registeredOnChain,
    kycStatus: u.kycStatus,
    verificationStatus: u.verificationStatus,
    subscriptionPlan: u.subscriptionPlan ?? "free",
    subscriptionEndsAt: u.subscriptionEndsAt ?? null,
    subscriptionCancelAtPeriodEnd: u.subscriptionCancelAtPeriodEnd ?? false,
  };
  if (u.stripeSubscriptionId && String(u.stripeSubscriptionId).trim()) {
    out.subscriptionBilling = "stripe";
    if (u.stripeSubscriptionStatus) out.stripeSubscriptionStatus = u.stripeSubscriptionStatus;
  }
  return out;
}
