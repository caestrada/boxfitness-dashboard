import { describe, expect, it } from "vitest";

import {
  BILLING_PLAN_DEFINITIONS,
  BILLING_TIER_KEYS,
  getBillingStatusMeta,
  getCurrentBillingTier,
  isBillingAccessActive,
  isPaidTier,
  normalizeBillingSubscriptionStatus,
  normalizeBillingTier,
} from "@/lib/billing";

describe("normalizeBillingTier", () => {
  it("returns free when the value is missing", () => {
    expect(normalizeBillingTier(null)).toBe("free");
    expect(normalizeBillingTier(undefined)).toBe("free");
    expect(normalizeBillingTier("")).toBe("free");
  });

  it("lowercases and trims recognized tier keys", () => {
    expect(normalizeBillingTier("  Pro  ")).toBe("pro");
    expect(normalizeBillingTier("STARTER")).toBe("starter");
  });

  it("falls back to free for unknown tiers", () => {
    expect(normalizeBillingTier("enterprise")).toBe("free");
  });
});

describe("normalizeBillingSubscriptionStatus", () => {
  it("returns inactive when the value is missing", () => {
    expect(normalizeBillingSubscriptionStatus(null)).toBe("inactive");
    expect(normalizeBillingSubscriptionStatus(undefined)).toBe("inactive");
  });

  it("normalizes known statuses", () => {
    expect(normalizeBillingSubscriptionStatus(" Active ")).toBe("active");
    expect(normalizeBillingSubscriptionStatus("PAST_DUE")).toBe("past_due");
  });

  it("falls back to inactive for unknown statuses", () => {
    expect(normalizeBillingSubscriptionStatus("weird")).toBe("inactive");
  });
});

describe("isPaidTier", () => {
  it("treats anything other than free as paid", () => {
    expect(isPaidTier("free")).toBe(false);
    expect(isPaidTier("starter")).toBe(true);
    expect(isPaidTier("pro")).toBe(true);
  });
});

describe("isBillingAccessActive", () => {
  it("treats trialing/active/past_due/unpaid/incomplete/paused as active", () => {
    for (const status of [
      "trialing",
      "active",
      "past_due",
      "unpaid",
      "incomplete",
      "paused",
    ] as const) {
      expect(isBillingAccessActive(status)).toBe(true);
    }
  });

  it("treats canceled/inactive/incomplete_expired as not active", () => {
    for (const status of [
      "canceled",
      "inactive",
      "incomplete_expired",
    ] as const) {
      expect(isBillingAccessActive(status)).toBe(false);
    }
  });
});

describe("getCurrentBillingTier", () => {
  it("returns free when snapshot is missing", () => {
    expect(getCurrentBillingTier(null)).toBe("free");
    expect(getCurrentBillingTier(undefined)).toBe("free");
  });

  it("returns the paid tier when subscription is active", () => {
    expect(
      getCurrentBillingTier({
        subscriptionTier: "pro",
        subscriptionStatus: "active",
      }),
    ).toBe("pro");
  });

  it("falls back to free when paid tier has lapsed access", () => {
    expect(
      getCurrentBillingTier({
        subscriptionTier: "starter",
        subscriptionStatus: "canceled",
      }),
    ).toBe("free");
  });
});

describe("getBillingStatusMeta", () => {
  it("labels cancel-at-period-end active subscriptions as ending soon", () => {
    const meta = getBillingStatusMeta({
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      subscriptionCancelAtPeriodEnd: true,
    });

    expect(meta).toEqual({ label: "Ending soon", tone: "warning" });
  });

  it("returns the Free label when the current tier is free", () => {
    expect(
      getBillingStatusMeta({
        subscriptionTier: "free",
        subscriptionStatus: "active",
      }),
    ).toEqual({ label: "Free", tone: "neutral" });
  });

  it("maps trialing paid subscriptions to the Trialing info tone", () => {
    expect(
      getBillingStatusMeta({
        subscriptionTier: "starter",
        subscriptionStatus: "trialing",
      }),
    ).toEqual({ label: "Trialing", tone: "info" });
  });
});

describe("plan definitions", () => {
  it("defines a plan for every tier key", () => {
    for (const tier of BILLING_TIER_KEYS) {
      expect(BILLING_PLAN_DEFINITIONS[tier]).toBeDefined();
      expect(BILLING_PLAN_DEFINITIONS[tier].features.length).toBeGreaterThan(0);
    }
  });
});
