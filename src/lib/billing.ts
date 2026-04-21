export const BILLING_TIER_KEYS = ["free", "starter", "pro"] as const;

export type BillingTierKey = (typeof BILLING_TIER_KEYS)[number];

export const BILLING_SUBSCRIPTION_STATUSES = [
  "inactive",
  "trialing",
  "active",
  "past_due",
  "canceled",
  "unpaid",
  "incomplete",
  "incomplete_expired",
  "paused",
] as const;

export type BillingSubscriptionStatus =
  (typeof BILLING_SUBSCRIPTION_STATUSES)[number];

export interface BillingPlanDefinition {
  name: string;
  monthlyPrice: number;
  description: string;
  features: string[];
}

export interface BillingSnapshot {
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
  subscriptionCurrentPeriodEnd?: string | null;
  subscriptionCancelAtPeriodEnd?: boolean | null;
}

export const BILLING_PLAN_DEFINITIONS: Record<
  BillingTierKey,
  BillingPlanDefinition
> = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    description: "For gyms just getting started with member management.",
    features: [
      "Up to 25 active members",
      "1 staff account",
      "Basic class scheduling",
      "Email support",
    ],
  },
  starter: {
    name: "Starter",
    monthlyPrice: 59,
    description: "For growing gyms ready to expand their operations.",
    features: [
      "Up to 100 active members",
      "3 staff accounts",
      "Advanced scheduling",
      "Priority email support",
      "Contact support",
    ],
  },
  pro: {
    name: "Pro",
    monthlyPrice: 119,
    description: "For established gyms managing multiple programs.",
    features: [
      "Everything in Starter",
      "Unlimited members",
      "10 staff accounts",
      "Multi-location support",
      "Phone and email support",
    ],
  },
};

const ACTIVE_BILLING_STATUSES = new Set<BillingSubscriptionStatus>([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

function isBillingTierKey(value: string): value is BillingTierKey {
  return BILLING_TIER_KEYS.includes(value as BillingTierKey);
}

function isBillingSubscriptionStatus(
  value: string,
): value is BillingSubscriptionStatus {
  return BILLING_SUBSCRIPTION_STATUSES.includes(
    value as BillingSubscriptionStatus,
  );
}

export function normalizeBillingTier(
  value: string | null | undefined,
): BillingTierKey {
  if (!value) {
    return "free";
  }

  const normalizedValue = value.trim().toLowerCase();
  return isBillingTierKey(normalizedValue) ? normalizedValue : "free";
}

export function normalizeBillingSubscriptionStatus(
  value: string | null | undefined,
): BillingSubscriptionStatus {
  if (!value) {
    return "inactive";
  }

  const normalizedValue = value.trim().toLowerCase();
  return isBillingSubscriptionStatus(normalizedValue)
    ? normalizedValue
    : "inactive";
}

export function isPaidTier(tier: BillingTierKey) {
  return tier !== "free";
}

export function isBillingAccessActive(status: BillingSubscriptionStatus) {
  return ACTIVE_BILLING_STATUSES.has(status);
}

export function getCurrentBillingTier(
  snapshot: BillingSnapshot | null | undefined,
) {
  const tier = normalizeBillingTier(snapshot?.subscriptionTier);
  const status = normalizeBillingSubscriptionStatus(
    snapshot?.subscriptionStatus,
  );

  if (tier === "free") {
    return "free";
  }

  if (isBillingAccessActive(status)) {
    return tier;
  }

  return "free";
}

export function getBillingStatusMeta(
  snapshot: BillingSnapshot | null | undefined,
) {
  const currentTier = getCurrentBillingTier(snapshot);
  const status = normalizeBillingSubscriptionStatus(
    snapshot?.subscriptionStatus,
  );

  if (currentTier === "free") {
    return {
      label: "Free",
      tone: "neutral" as const,
    };
  }

  if (snapshot?.subscriptionCancelAtPeriodEnd && status === "active") {
    return {
      label: "Ending soon",
      tone: "warning" as const,
    };
  }

  switch (status) {
    case "trialing":
      return {
        label: "Trialing",
        tone: "info" as const,
      };
    case "active":
      return {
        label: "Active",
        tone: "success" as const,
      };
    case "past_due":
      return {
        label: "Past due",
        tone: "warning" as const,
      };
    case "unpaid":
      return {
        label: "Unpaid",
        tone: "warning" as const,
      };
    case "incomplete":
      return {
        label: "Incomplete",
        tone: "warning" as const,
      };
    case "paused":
      return {
        label: "Paused",
        tone: "warning" as const,
      };
    case "canceled":
      return {
        label: "Canceled",
        tone: "neutral" as const,
      };
    default:
      return {
        label: "Inactive",
        tone: "neutral" as const,
      };
  }
}
