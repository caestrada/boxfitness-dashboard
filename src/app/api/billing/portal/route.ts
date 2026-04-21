import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod/v3";

import {
  createStripeClient,
  getStripePriceIdForTier,
  hasStripeBillingEnv,
  MISSING_STRIPE_BILLING_ENV_MESSAGE,
} from "@/lib/billing-server";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/url";

export const runtime = "nodejs";

const createPortalBodySchema = z.object({
  organizationId: z
    .string()
    .uuid("Select a valid workspace before opening billing."),
  targetTier: z.enum(["free", "starter", "pro"]).optional(),
});

function createErrorResponse(status: number, message: string) {
  return NextResponse.json({ message }, { status });
}

const MANAGED_STRIPE_SUBSCRIPTION_STATUSES =
  new Set<Stripe.Subscription.Status>([
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ]);

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
  customerId: string,
  organizationId: string,
  storedSubscriptionId: string | null,
) {
  const directSubscription = await getStripeSubscriptionById(
    stripe,
    storedSubscriptionId,
  );
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

function getPortalFlowSubscriptionItem(subscription: Stripe.Subscription) {
  const primaryItem = subscription.items.data[0] ?? null;

  if (!primaryItem?.id) {
    throw new Error(
      "Stripe could not find the active subscription item for this workspace.",
    );
  }

  if (subscription.items.data.length > 1) {
    throw new Error(
      "This workspace has a multi-item Stripe subscription that cannot be changed from this flow.",
    );
  }

  return primaryItem;
}

async function buildPortalReturnUrl(billingState?: string) {
  const returnUrl = new URL("/dashboard/profile", await getRequestOrigin());

  if (billingState) {
    returnUrl.searchParams.set("billing", billingState);
  }

  return returnUrl;
}

export async function POST(request: Request) {
  if (!hasStripeBillingEnv()) {
    return createErrorResponse(503, MISSING_STRIPE_BILLING_ENV_MESSAGE);
  }

  let payload: z.infer<typeof createPortalBodySchema>;

  try {
    payload = createPortalBodySchema.parse(await request.json());
  } catch {
    return createErrorResponse(
      400,
      "Choose a valid workspace before opening billing.",
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
      .select(
        "id, slug, stripe_customer_id, stripe_subscription_id, subscription_tier",
      )
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

  if (!organization.stripe_customer_id) {
    return createErrorResponse(
      409,
      "This workspace does not have a synced Stripe customer yet. Wait for billing sync, then try again.",
    );
  }

  const stripe = createStripeClient();

  try {
    const returnUrl = await buildPortalReturnUrl();
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: organization.stripe_customer_id,
      return_url: returnUrl.toString(),
    };

    if (payload.targetTier) {
      const activeSubscription = await getActiveOrganizationSubscription(
        stripe,
        organization.stripe_customer_id,
        organization.id,
        organization.stripe_subscription_id ?? null,
      );

      if (!activeSubscription) {
        return createErrorResponse(
          409,
          "This workspace does not have an active Stripe subscription to change yet.",
        );
      }

      if (payload.targetTier === "free") {
        const completedReturnUrl =
          await buildPortalReturnUrl("cancel-scheduled");

        sessionParams.flow_data = {
          after_completion: {
            type: "redirect",
            redirect: {
              return_url: completedReturnUrl.toString(),
            },
          },
          subscription_cancel: {
            subscription: activeSubscription.id,
          },
          type: "subscription_cancel",
        };
      } else {
        const currentTier =
          organization.subscription_tier?.trim().toLowerCase() ?? null;

        if (currentTier === payload.targetTier) {
          return createErrorResponse(
            409,
            "This workspace is already on the selected plan.",
          );
        }

        const subscriptionItem =
          getPortalFlowSubscriptionItem(activeSubscription);
        const targetPriceId = await getStripePriceIdForTier(
          stripe,
          payload.targetTier,
        );

        if (subscriptionItem.price.id === targetPriceId) {
          return createErrorResponse(
            409,
            "This workspace is already on the selected plan.",
          );
        }

        const completedReturnUrl = await buildPortalReturnUrl("plan-updated");

        sessionParams.flow_data = {
          after_completion: {
            type: "redirect",
            redirect: {
              return_url: completedReturnUrl.toString(),
            },
          },
          subscription_update_confirm: {
            items: [
              {
                id: subscriptionItem.id,
                price: targetPriceId,
                quantity: subscriptionItem.quantity ?? 1,
              },
            ],
            subscription: activeSubscription.id,
          },
          type: "subscription_update_confirm",
        };
      }
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Stripe Billing Portal could not be opened.";
    return createErrorResponse(500, message);
  }
}
