import { describe, expect, it } from "vitest";

import {
  getInitials,
  getUserDisplayName,
  parseDashboardBillingOrganizations,
  parseDashboardGyms,
  parseDashboardProfile,
  resolveActiveGym,
} from "@/lib/dashboard";

describe("parseDashboardGyms", () => {
  it("returns the gyms that match the schema", () => {
    const gyms = parseDashboardGyms([
      { id: "gym-1", name: "Main", slug: "main" },
      { id: "gym-2", name: "Branch", slug: "branch" },
    ]);

    expect(gyms).toEqual([
      { id: "gym-1", name: "Main", slug: "main" },
      { id: "gym-2", name: "Branch", slug: "branch" },
    ]);
  });

  it("returns an empty array when any gym fails validation", () => {
    expect(parseDashboardGyms([{ id: "gym-1", slug: "main" }])).toEqual([]);
    expect(parseDashboardGyms(null)).toEqual([]);
  });
});

describe("resolveActiveGym", () => {
  const gyms = [
    { id: "gym-1", name: "A", slug: "a" },
    { id: "gym-2", name: "B", slug: "b" },
  ];

  it("returns the gym matching the saved default", () => {
    expect(resolveActiveGym(gyms, "gym-2")).toBe(gyms[1]);
  });

  it("falls back to the first gym when the default is missing", () => {
    expect(resolveActiveGym(gyms, null)).toBe(gyms[0]);
    expect(resolveActiveGym(gyms, "gym-unknown")).toBe(gyms[0]);
  });

  it("returns null when there are no gyms", () => {
    expect(resolveActiveGym([], "gym-1")).toBeNull();
  });
});

describe("parseDashboardBillingOrganizations", () => {
  it("merges membership roles onto the organization rows", () => {
    const organizations = parseDashboardBillingOrganizations(
      [
        {
          id: "gym-1",
          name: "Main",
          slug: "main",
          stripe_customer_id: "cus_123",
          subscription_tier: "pro",
          subscription_status: "active",
          subscription_current_period_end: "2026-05-01T00:00:00.000Z",
          subscription_cancel_at_period_end: false,
        },
      ],
      [{ organization_id: "gym-1", role: "owner", status: "active" }],
    );

    expect(organizations).toHaveLength(1);
    expect(organizations[0]).toMatchObject({
      id: "gym-1",
      role: "owner",
      stripeCustomerId: "cus_123",
      subscriptionTier: "pro",
      subscriptionStatus: "active",
      subscriptionCancelAtPeriodEnd: false,
    });
  });

  it("ignores memberships that are not active", () => {
    const organizations = parseDashboardBillingOrganizations(
      [
        {
          id: "gym-1",
          name: "Main",
          slug: "main",
        },
      ],
      [{ organization_id: "gym-1", role: "owner", status: "invited" }],
    );

    expect(organizations[0].role).toBeNull();
  });
});

describe("parseDashboardProfile", () => {
  it("falls back to the provided email when the profile is invalid", () => {
    expect(parseDashboardProfile(null, "fallback@example.com")).toEqual({
      email: "fallback@example.com",
      fullName: null,
      avatarUrl: null,
      defaultOrganizationId: null,
    });
  });

  it("prefers the profile email over the fallback", () => {
    expect(
      parseDashboardProfile(
        {
          email: "profile@example.com",
          full_name: "Carlos",
          avatar_url: null,
          default_organization_id: "gym-1",
        },
        "fallback@example.com",
      ),
    ).toEqual({
      email: "profile@example.com",
      fullName: "Carlos",
      avatarUrl: null,
      defaultOrganizationId: "gym-1",
    });
  });
});

describe("getUserDisplayName", () => {
  it("prefers full name, then email, then fallback", () => {
    expect(
      getUserDisplayName({
        fullName: "Carlos",
        email: null,
        avatarUrl: null,
        defaultOrganizationId: null,
      }),
    ).toBe("Carlos");

    expect(
      getUserDisplayName({
        fullName: null,
        email: "cestr008@example.com",
        avatarUrl: null,
        defaultOrganizationId: null,
      }),
    ).toBe("cestr008@example.com");

    expect(
      getUserDisplayName({
        fullName: null,
        email: null,
        avatarUrl: null,
        defaultOrganizationId: null,
      }),
    ).toBe("Box Fitness User");
  });
});

describe("getInitials", () => {
  it("handles single-word and multi-word names", () => {
    expect(getInitials("Carlos")).toBe("CA");
    expect(getInitials("Carlos Estrada")).toBe("CE");
    expect(getInitials("  ")).toBe("BF");
  });
});
