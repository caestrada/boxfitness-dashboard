import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod/v3";
import { normalizeBillingSubscriptionStatus } from "@/lib/billing";
import {
  createStripeClient,
  getBillingTierFromStripeSubscription,
  getStripePriceIdForTier,
  hasStripeBillingEnv,
  MISSING_STRIPE_BILLING_ENV_MESSAGE,
} from "@/lib/billing-server";
import {
  createAdminClient,
  hasSupabaseAdminEnv,
  MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getRequestOrigin } from "@/lib/url";

export const runtime = "nodejs";

const createCheckoutBodySchema = z.object({
  organizationId: z
    .string()
    .uuid("Select a valid workspace before subscribing."),
  tier: z.enum(["starter", "pro"]),
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

function isManagedStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  return MANAGED_STRIPE_SUBSCRIPTION_STATUSES.has(status);
}

function toIsoDate(value: number | null | undefined) {
  return typeof value === "number"
    ? new Date(value * 1000).toISOString()
    : null;
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return (
    subscription.items.data[0]?.current_period_end ??
    subscription.cancel_at ??
    null
  );
}

async function findManagedStripeSubscriptionForCustomer(
  stripe: Stripe,
  customerId: string,
) {
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
  });

  return (
    subscriptions.data.find((subscription) =>
      isManagedStripeSubscriptionStatus(subscription.status),
    ) ?? null
  );
}

async function findExistingStripeBillingForOrganization(
  stripe: Stripe,
  organizationId: string,
  options: {
    customerId: string | null;
    email: string | null;
  },
) {
  if (options.customerId) {
    const subscription = await findManagedStripeSubscriptionForCustomer(
      stripe,
      options.customerId,
    );

    if (subscription) {
      return {
        customerId: options.customerId,
        subscription,
      };
    }
  }

  if (!options.email) {
    return null;
  }

  const customers = await stripe.customers.list({
    email: options.email,
    limit: 20,
  });

  for (const customer of customers.data) {
    const subscription = await findManagedStripeSubscriptionForCustomer(
      stripe,
      customer.id,
    );

    if (subscription?.metadata.organization_id?.trim() === organizationId) {
      return {
        customerId: customer.id,
        subscription,
      };
    }
  }

  return null;
}

async function persistStripeCustomerId(
  organizationId: string,
  stripeCustomerId: string,
) {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("organizations")
    .update({
      stripe_customer_id: stripeCustomerId,
    })
    .eq("id", organizationId)
    .is("stripe_customer_id", null)
    .select("stripe_customer_id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data?.stripe_customer_id) {
    return data.stripe_customer_id;
  }

  const { data: existingOrganization, error: existingOrganizationError } =
    await adminClient
      .from("organizations")
      .select("stripe_customer_id")
      .eq("id", organizationId)
      .maybeSingle();

  if (existingOrganizationError) {
    throw existingOrganizationError;
  }

  return existingOrganization?.stripe_customer_id ?? stripeCustomerId;
}

async function syncOrganizationBillingFromStripe(
  organizationId: string,
  stripeCustomerId: string,
  subscription: Stripe.Subscription,
) {
  const adminClient = createAdminClient();
  const subscriptionTier = getBillingTierFromStripeSubscription(subscription);
  const updateValues: {
    stripe_customer_id: string;
    stripe_subscription_id: string;
    subscription_status: Stripe.Subscription.Status;
    subscription_current_period_end: string | null;
    subscription_cancel_at_period_end: boolean;
    subscription_tier?: "starter" | "pro";
  } = {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_current_period_end: toIsoDate(
      getSubscriptionCurrentPeriodEnd(subscription),
    ),
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
  };

  if (subscriptionTier) {
    updateValues.subscription_tier = subscriptionTier;
  }

  const { error } = await adminClient
    .from("organizations")
    .update(updateValues)
    .eq("id", organizationId);

  if (error) {
    throw error;
  }
}

export async function POST(request: Request) {
  if (!hasStripeBillingEnv()) {
    return createErrorResponse(503, MISSING_STRIPE_BILLING_ENV_MESSAGE);
  }

  if (!hasSupabaseAdminEnv()) {
    return createErrorResponse(503, MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE);
  }

  let payload: z.infer<typeof createCheckoutBodySchema>;

  try {
    payload = createCheckoutBodySchema.parse(await request.json());
  } catch {
    return createErrorResponse(
      400,
      "Choose a valid paid plan before continuing.",
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
        "id, name, slug, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_tier",
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
      "Only workspace owners can start a subscription.",
    );
  }

  const currentStatus = normalizeBillingSubscriptionStatus(
    organization.subscription_status,
  );
  const hasManagedSubscription =
    Boolean(organization.stripe_subscription_id) ||
    [
      "trialing",
      "active",
      "past_due",
      "unpaid",
      "incomplete",
      "paused",
    ].includes(currentStatus);

  if (hasManagedSubscription) {
    return createErrorResponse(
      409,
      "This workspace already has a Stripe subscription. Open billing management instead of starting a second checkout.",
    );
  }

  const stripe = createStripeClient();
  const existingStripeBilling = await findExistingStripeBillingForOrganization(
    stripe,
    organization.id,
    {
      customerId: organization.stripe_customer_id ?? null,
      email: user.email ?? null,
    },
  );

  if (existingStripeBilling) {
    await syncOrganizationBillingFromStripe(
      organization.id,
      existingStripeBilling.customerId,
      existingStripeBilling.subscription,
    );

    return createErrorResponse(
      409,
      "This workspace already has a Stripe subscription. Open billing management instead of starting a second checkout.",
    );
  }

  const stripeCustomerId =
    organization.stripe_customer_id ??
    (await persistStripeCustomerId(
      organization.id,
      (
        await stripe.customers.create({
          email: user.email ?? undefined,
          name: organization.name,
          metadata: {
            organization_id: organization.id,
            organization_slug: organization.slug,
          },
        })
      ).id,
    ));

  const origin = await getRequestOrigin();
  const successUrl = new URL("/dashboard/profile", origin);
  successUrl.searchParams.set("billing", "success");

  const cancelUrl = new URL("/dashboard/profile", origin);
  cancelUrl.searchParams.set("billing", "canceled");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      client_reference_id: organization.id,
      customer: stripeCustomerId,
      line_items: [
        {
          price: await getStripePriceIdForTier(stripe, payload.tier),
          quantity: 1,
        },
      ],
      metadata: {
        organization_id: organization.id,
        organization_slug: organization.slug,
        subscription_tier: payload.tier,
      },
      subscription_data: {
        metadata: {
          organization_id: organization.id,
          organization_slug: organization.slug,
          subscription_tier: payload.tier,
        },
      },
      success_url: successUrl.toString(),
      cancel_url: cancelUrl.toString(),
    });

    if (!session.url) {
      return createErrorResponse(
        502,
        "Stripe Checkout did not return a redirect URL.",
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Stripe Checkout could not be started.";
    return createErrorResponse(500, message);
  }
}
