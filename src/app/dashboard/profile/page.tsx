import { redirect } from "next/navigation";

import { DefaultGymCard } from "@/components/dashboard/default-gym-card";
import { OrganizationSubscriptionCard } from "@/components/dashboard/organization-subscription-card";
import { ProfileCard } from "@/components/dashboard/profile-card";
import { ThemePreferenceCard } from "@/components/dashboard/theme-preference-card";
import {
  hasStripeBillingEnv,
  synchronizeOrganizationBillingSnapshot,
} from "@/lib/billing-server";
import {
  parseDashboardBillingOrganizations,
  parseDashboardProfile,
  resolveActiveGym,
} from "@/lib/dashboard";
import { hasSupabaseAdminEnv } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/profile");
  }

  const [
    { data: profileRow },
    { data: organizationRows },
    { data: membershipRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name, avatar_url, default_organization_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select(
        "id, name, slug, stripe_customer_id, subscription_tier, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end",
      )
      .is("archived_at", null)
      .order("name"),
    supabase
      .from("organization_members")
      .select("organization_id, role, status")
      .eq("user_id", user.id)
      .eq("status", "active"),
  ]);

  const profile = parseDashboardProfile(profileRow, user.email ?? null);
  const billingOrganizations = parseDashboardBillingOrganizations(
    organizationRows,
    membershipRows,
  );
  let activeOrganization = resolveActiveGym(
    billingOrganizations,
    profile.defaultOrganizationId,
  );
  const billingConfigured = hasStripeBillingEnv() && hasSupabaseAdminEnv();
  let billingSyncFailed = false;

  if (
    billingConfigured &&
    activeOrganization &&
    (activeOrganization.stripeCustomerId ||
      activeOrganization.subscriptionTier !== "free" ||
      activeOrganization.subscriptionStatus !== "inactive")
  ) {
    try {
      const synchronizedSnapshot = await synchronizeOrganizationBillingSnapshot(
        activeOrganization.id,
      );

      if (synchronizedSnapshot) {
        activeOrganization = {
          ...activeOrganization,
          stripeCustomerId: normalizeOptionalString(
            synchronizedSnapshot.stripe_customer_id,
          ),
          subscriptionTier: normalizeOptionalString(
            synchronizedSnapshot.subscription_tier,
          ),
          subscriptionStatus: normalizeOptionalString(
            synchronizedSnapshot.subscription_status,
          ),
          subscriptionCurrentPeriodEnd: normalizeOptionalString(
            synchronizedSnapshot.subscription_current_period_end,
          ),
          subscriptionCancelAtPeriodEnd: Boolean(
            synchronizedSnapshot.subscription_cancel_at_period_end,
          ),
        };
      }
    } catch (error) {
      billingSyncFailed = true;
      console.error(
        "Failed to synchronize organization billing snapshot.",
        error,
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <ProfileCard user={profile} />

      <DefaultGymCard
        defaultOrganizationId={profile.defaultOrganizationId}
        gyms={billingOrganizations}
      />

      <OrganizationSubscriptionCard
        billingConfigured={billingConfigured}
        billingSyncFailed={billingSyncFailed}
        organization={activeOrganization}
      />

      <ThemePreferenceCard />
    </div>
  );
}
