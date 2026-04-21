import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod/v3";

import {
  createStripeClient,
  hasStripeBillingEnv,
  MISSING_STRIPE_BILLING_ENV_MESSAGE,
  synchronizeOrganizationBillingSnapshot,
} from "@/lib/billing-server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const renewSubscriptionBodySchema = z.object({
  organizationId: z
    .string()
    .uuid("Select a valid workspace before renewing the plan."),
});

const MANAGED_STRIPE_SUBSCRIPTION_STATUSES =
  new Set<Stripe.Subscription.Status>([
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ]);

function createErrorResponse(status: number, message: string) {
  return NextResponse.json({ message }, { status });
}

function isStripeResourceMissingError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  );
}

async function getStripeSubscriptionById(
  stripe: Stripe,
  subscriptionId: string | null | undefined,
) {
  if (!subscriptionId) {
    return null;
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      return null;
    }

    throw error;
  }
}

function getOrganizationIdFromStripeSubscription(
  subscription: Stripe.Subscription,
) {
  const organizationId = subscription.metadata.organization_id?.trim();
  return organizationId && organizationId.length > 0 ? organizationId : null;
}

function getManagedSubscriptionForOrganization(
  subscriptions: Stripe.Subscription[],
  organizationId: string,
  preferredSubscriptionId?: string | null,
) {
  const uniqueSubscriptions = Array.from(
    new Map(
      subscriptions.map((subscription) => [subscription.id, subscription]),
    ).values(),
  );

  return (
    uniqueSubscriptions
      .sort((left, right) => {
        const leftOrganizationMatch =
          getOrganizationIdFromStripeSubscription(left) === organizationId
            ? 1
            : 0;
        const rightOrganizationMatch =
          getOrganizationIdFromStripeSubscription(right) === organizationId
            ? 1
            : 0;

        if (leftOrganizationMatch !== rightOrganizationMatch) {
          return rightOrganizationMatch - leftOrganizationMatch;
        }

        const leftManagedStatus = MANAGED_STRIPE_SUBSCRIPTION_STATUSES.has(
          left.status,
        )
          ? 1
          : 0;
        const rightManagedStatus = MANAGED_STRIPE_SUBSCRIPTION_STATUSES.has(
          right.status,
        )
          ? 1
          : 0;

        if (leftManagedStatus !== rightManagedStatus) {
          return rightManagedStatus - leftManagedStatus;
        }

        const leftPreferredMatch = left.id === preferredSubscriptionId ? 1 : 0;
        const rightPreferredMatch =
          right.id === preferredSubscriptionId ? 1 : 0;

        if (leftPreferredMatch !== rightPreferredMatch) {
          return rightPreferredMatch - leftPreferredMatch;
        }

        return (right.created ?? 0) - (left.created ?? 0);
      })
      .find((subscription) =>
        MANAGED_STRIPE_SUBSCRIPTION_STATUSES.has(subscription.status),
      ) ?? null
  );
}

async function getActiveOrganizationSubscription(
  stripe: Stripe,
  customerId: string | null,
  organizationId: string,
  storedSubscriptionId: string | null,
) {
  const directSubscription = await getStripeSubscriptionById(
    stripe,
    storedSubscriptionId,
  );
  if (!customerId) {
    return directSubscription &&
      MANAGED_STRIPE_SUBSCRIPTION_STATUSES.has(directSubscription.status)
      ? directSubscription
      : null;
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  return getManagedSubscriptionForOrganization(
    [
      ...subscriptions.data,
      ...(directSubscription ? [directSubscription] : []),
    ],
    organizationId,
    storedSubscriptionId,
  );
}

export async function POST(request: Request) {
  if (!hasStripeBillingEnv()) {
    return createErrorResponse(503, MISSING_STRIPE_BILLING_ENV_MESSAGE);
  }

  let payload: z.infer<typeof renewSubscriptionBodySchema>;

  try {
    payload = renewSubscriptionBodySchema.parse(await request.json());
  } catch {
    return createErrorResponse(
      400,
      "Choose a valid workspace before renewing the plan.",
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse(401, "You must be signed in to manage billing.");
  }

  const [
    { data: membership },
    { data: organization, error: organizationError },
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", payload.organizationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, stripe_customer_id, stripe_subscription_id")
      .eq("id", payload.organizationId)
      .is("archived_at", null)
      .maybeSingle(),
  ]);

  if (organizationError) {
    return createErrorResponse(500, organizationError.message);
  }

  if (!organization || !membership) {
    return createErrorResponse(
      404,
      "The selected workspace could not be found.",
    );
  }

  if (membership.role !== "owner") {
    return createErrorResponse(
      403,
      "Only workspace owners can manage billing.",
    );
  }

  if (
    !organization.stripe_customer_id &&
    !organization.stripe_subscription_id
  ) {
    return createErrorResponse(
      409,
      "This workspace does not have a Stripe subscription to renew.",
    );
  }

  const stripe = createStripeClient();

  try {
    const activeSubscription = await getActiveOrganizationSubscription(
      stripe,
      organization.stripe_customer_id ?? null,
      organization.id,
      organization.stripe_subscription_id ?? null,
    );

    if (!activeSubscription) {
      return createErrorResponse(
        409,
        "This workspace does not have an active Stripe subscription.",
      );
    }

    if (!activeSubscription.cancel_at_period_end) {
      return createErrorResponse(
        409,
        "This workspace is not scheduled to cancel.",
      );
    }

    await stripe.subscriptions.update(activeSubscription.id, {
      cancel_at_period_end: false,
    });
    await synchronizeOrganizationBillingSnapshot(organization.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The plan could not be renewed.";
    return createErrorResponse(500, message);
  }
}
