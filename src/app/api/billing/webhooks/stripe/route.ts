import Stripe from "stripe"
import { NextResponse } from "next/server"

import {
  createStripeClient,
  getBillingTierFromStripeSubscription,
  getStripeWebhookSecret,
  hasStripeBillingEnv,
  MISSING_STRIPE_BILLING_ENV_MESSAGE,
} from "@/lib/billing-server"
import { createAdminClient, hasSupabaseAdminEnv } from "@/lib/supabase/admin"

export const runtime = "nodejs"

function createErrorResponse(status: number, message: string) {
  return NextResponse.json({ message }, { status })
}

function toIsoDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? subscription.cancel_at ?? null
}

async function resolveOrganizationIdForSubscription(
  subscription: Stripe.Subscription
) {
  const directOrganizationId = subscription.metadata.organization_id?.trim()

  if (directOrganizationId) {
    return directOrganizationId
  }

  const adminClient = createAdminClient()

  if (subscription.id) {
    const { data: subscriptionMatch } = await adminClient
      .from("organizations")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle()

    if (subscriptionMatch?.id) {
      return subscriptionMatch.id
    }
  }

  if (typeof subscription.customer === "string") {
    const { data: customerMatch } = await adminClient
      .from("organizations")
      .select("id")
      .eq("stripe_customer_id", subscription.customer)
      .maybeSingle()

    if (customerMatch?.id) {
      return customerMatch.id
    }
  }

  return null
}

async function updateOrganizationBillingState(
  organizationId: string,
  values: Record<string, string | boolean | null>
) {
  const adminClient = createAdminClient()
  const { error } = await adminClient
    .from("organizations")
    .update(values)
    .eq("id", organizationId)

  if (error) {
    throw error
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    return
  }

  const organizationId = session.metadata?.organization_id?.trim()

  if (!organizationId) {
    return
  }

  await updateOrganizationBillingState(organizationId, {
    stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
    stripe_subscription_id: typeof session.subscription === "string" ? session.subscription : null,
  })
}

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const organizationId = await resolveOrganizationIdForSubscription(subscription)

  if (!organizationId) {
    return
  }

  const tier = getBillingTierFromStripeSubscription(subscription)

  if (!tier) {
    throw new Error(
      `Unable to map Stripe subscription ${subscription.id} to a Box Fitness billing tier.`
    )
  }

  await updateOrganizationBillingState(organizationId, {
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    subscription_tier: tier,
    subscription_current_period_end: toIsoDate(getSubscriptionCurrentPeriodEnd(subscription)),
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const organizationId = await resolveOrganizationIdForSubscription(subscription)

  if (!organizationId) {
    return
  }

  await updateOrganizationBillingState(organizationId, {
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
    stripe_subscription_id: null,
    subscription_status: "canceled",
    subscription_tier: "free",
    subscription_current_period_end: toIsoDate(getSubscriptionCurrentPeriodEnd(subscription)),
    subscription_cancel_at_period_end: false,
  })
}

export async function POST(request: Request) {
  if (!hasStripeBillingEnv()) {
    return createErrorResponse(503, MISSING_STRIPE_BILLING_ENV_MESSAGE)
  }

  if (!hasSupabaseAdminEnv()) {
    return createErrorResponse(
      503,
      "Add SUPABASE_SERVICE_ROLE_KEY to enable Stripe webhook subscription sync."
    )
  }

  const stripeSignature = request.headers.get("stripe-signature")

  if (!stripeSignature) {
    return createErrorResponse(400, "Missing Stripe signature header.")
  }

  const payload = await request.text()
  const stripe = createStripeClient()

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(payload, stripeSignature, getStripeWebhookSecret())
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe webhook signature verification failed."
    return createErrorResponse(400, message)
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break
      default:
        break
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe webhook processing failed."
    return createErrorResponse(500, message)
  }

  return NextResponse.json({ received: true })
}
