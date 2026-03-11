import "server-only"

import Stripe from "stripe"

import { normalizeBillingTier, type BillingTierKey } from "@/lib/billing"
import { createAdminClient } from "@/lib/supabase/admin"

const stripeSecretKey = process.env.STRIPE_SECRET_KEY?.trim()
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
const stripeStarterPriceId = process.env.STRIPE_STARTER_PRICE_ID?.trim()
const stripeProPriceId = process.env.STRIPE_PRO_PRICE_ID?.trim()
const resolvedStripePlanIdCache = new Map<string, Promise<string>>()

const STRIPE_PRICE_ID_PREFIX = "price_"
const STRIPE_PRODUCT_ID_PREFIX = "prod_"
const MANAGED_STRIPE_SUBSCRIPTION_STATUSES = new Set<Stripe.Subscription.Status>([
  "trialing",
  "active",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
])

export interface OrganizationBillingSnapshot {
  id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_tier: string | null
  subscription_status: string | null
  subscription_current_period_end: string | null
  subscription_cancel_at_period_end: boolean | null
}

export const MISSING_STRIPE_BILLING_ENV_MESSAGE =
  "Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_STARTER_PRICE_ID, and STRIPE_PRO_PRICE_ID to enable Box Fitness billing."

export function hasStripeCheckoutEnv() {
  return Boolean(stripeSecretKey && stripeStarterPriceId && stripeProPriceId)
}

export function hasStripeWebhookEnv() {
  return Boolean(stripeSecretKey && stripeWebhookSecret)
}

export function hasStripeBillingEnv() {
  return hasStripeCheckoutEnv() && hasStripeWebhookEnv()
}

export function createStripeClient() {
  if (!stripeSecretKey) {
    throw new Error(MISSING_STRIPE_BILLING_ENV_MESSAGE)
  }

  return new Stripe(stripeSecretKey)
}

export function getStripeWebhookSecret() {
  if (!stripeWebhookSecret) {
    throw new Error(MISSING_STRIPE_BILLING_ENV_MESSAGE)
  }

  return stripeWebhookSecret
}

function isStripePriceId(value: string) {
  return value.startsWith(STRIPE_PRICE_ID_PREFIX)
}

function isStripeProductId(value: string) {
  return value.startsWith(STRIPE_PRODUCT_ID_PREFIX)
}

function isExpandedRecurringPrice(
  price: Stripe.Product["default_price"]
): price is Stripe.Price {
  return Boolean(
    price &&
      typeof price !== "string" &&
      !("deleted" in price) &&
      price.active &&
      price.type === "recurring"
  )
}

function getConfiguredStripePlanId(tier: Exclude<BillingTierKey, "free">) {
  if (!hasStripeCheckoutEnv()) {
    throw new Error(MISSING_STRIPE_BILLING_ENV_MESSAGE)
  }

  return tier === "starter" ? stripeStarterPriceId! : stripeProPriceId!
}

async function loadRecurringPriceIdForProduct(stripe: Stripe, productId: string) {
  const product = await stripe.products.retrieve(productId, {
    expand: ["default_price"],
  })

  if (isExpandedRecurringPrice(product.default_price)) {
    return product.default_price.id
  }

  const recurringPrices = await stripe.prices.list({
    product: productId,
    active: true,
    type: "recurring",
    limit: 10,
  })

  if (recurringPrices.data.length === 1) {
    return recurringPrices.data[0].id
  }

  if (recurringPrices.data.length === 0) {
    throw new Error(
      `Stripe product ${productId} does not have an active recurring price. Use a price_... ID or assign a default recurring price to the product.`
    )
  }

  throw new Error(
    `Stripe product ${productId} has multiple active recurring prices. Configure the exact price_... ID in STRIPE_STARTER_PRICE_ID or STRIPE_PRO_PRICE_ID.`
  )
}

export async function getStripePriceIdForTier(
  stripe: Stripe,
  tier: Exclude<BillingTierKey, "free">
) {
  const configuredPlanId = getConfiguredStripePlanId(tier)

  if (isStripePriceId(configuredPlanId)) {
    return configuredPlanId
  }

  if (!isStripeProductId(configuredPlanId)) {
    throw new Error(
      `Invalid Stripe plan identifier "${configuredPlanId}" for ${tier}. Use a price_... ID or a prod_... product ID.`
    )
  }

  const cachedResolvedPlanId = resolvedStripePlanIdCache.get(configuredPlanId)

  if (cachedResolvedPlanId) {
    return cachedResolvedPlanId
  }

  const resolvedPlanIdPromise = loadRecurringPriceIdForProduct(stripe, configuredPlanId)
  resolvedStripePlanIdCache.set(configuredPlanId, resolvedPlanIdPromise)

  try {
    return await resolvedPlanIdPromise
  } catch (error) {
    resolvedStripePlanIdCache.delete(configuredPlanId)
    throw error
  }
}

function getBillingTierForStripePlan(
  priceId: string | null | undefined,
  productId: string | null | undefined
): Exclude<BillingTierKey, "free"> | null {
  if (!hasStripeCheckoutEnv()) {
    return null
  }

  if (priceId === stripeStarterPriceId || productId === stripeStarterPriceId) {
    return "starter"
  }

  if (priceId === stripeProPriceId || productId === stripeProPriceId) {
    return "pro"
  }

  return null
}

function getPriceProductId(price: Stripe.SubscriptionItem["price"] | undefined) {
  if (!price) {
    return null
  }

  return typeof price.product === "string" ? price.product : price.product?.id ?? null
}

function toIsoDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null
}

function getSubscriptionCurrentPeriodEnd(subscription: Stripe.Subscription) {
  return subscription.items.data[0]?.current_period_end ?? subscription.cancel_at ?? null
}

function isManagedStripeSubscriptionStatus(status: Stripe.Subscription.Status) {
  return MANAGED_STRIPE_SUBSCRIPTION_STATUSES.has(status)
}

function isStripeResourceMissingError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  )
}

async function getStripeSubscriptionById(
  stripe: Stripe,
  subscriptionId: string | null | undefined
) {
  if (!subscriptionId) {
    return null
  }

  try {
    return await stripe.subscriptions.retrieve(subscriptionId)
  } catch (error) {
    if (isStripeResourceMissingError(error)) {
      return null
    }

    throw error
  }
}

function getOrganizationIdFromStripeSubscription(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organization_id?.trim()
  return organizationId && organizationId.length > 0 ? organizationId : null
}

function getRelevantStripeSubscription(
  subscriptions: Stripe.Subscription[],
  organizationId: string,
  preferredSubscriptionId?: string | null
) {
  const uniqueSubscriptions = Array.from(
    new Map(subscriptions.map((subscription) => [subscription.id, subscription])).values()
  )

  return (
    uniqueSubscriptions.sort((left, right) => {
      const leftOrganizationMatch =
        getOrganizationIdFromStripeSubscription(left) === organizationId ? 1 : 0
      const rightOrganizationMatch =
        getOrganizationIdFromStripeSubscription(right) === organizationId ? 1 : 0

      if (leftOrganizationMatch !== rightOrganizationMatch) {
        return rightOrganizationMatch - leftOrganizationMatch
      }

      const leftManagedStatus = isManagedStripeSubscriptionStatus(left.status) ? 1 : 0
      const rightManagedStatus = isManagedStripeSubscriptionStatus(right.status) ? 1 : 0

      if (leftManagedStatus !== rightManagedStatus) {
        return rightManagedStatus - leftManagedStatus
      }

      const leftPreferredMatch = left.id === preferredSubscriptionId ? 1 : 0
      const rightPreferredMatch = right.id === preferredSubscriptionId ? 1 : 0

      if (leftPreferredMatch !== rightPreferredMatch) {
        return rightPreferredMatch - leftPreferredMatch
      }

      return (right.created ?? 0) - (left.created ?? 0)
    })[0] ?? null
  )
}

function getFallbackTierForSnapshot(snapshot: OrganizationBillingSnapshot) {
  const tier = normalizeBillingTier(snapshot.subscription_tier)
  return tier === "free" ? null : tier
}

function buildSynchronizedBillingSnapshot(
  snapshot: OrganizationBillingSnapshot,
  subscription: Stripe.Subscription | null
): OrganizationBillingSnapshot {
  if (!subscription) {
    const hasStoredPaidSubscription = Boolean(
      getFallbackTierForSnapshot(snapshot) || snapshot.stripe_subscription_id
    )

    return {
      ...snapshot,
      stripe_subscription_id: null,
      subscription_tier: "free",
      subscription_status: hasStoredPaidSubscription ? "canceled" : "inactive",
      subscription_current_period_end: null,
      subscription_cancel_at_period_end: false,
    }
  }

  const periodEnd = getSubscriptionCurrentPeriodEnd(subscription)
  const periodEndIso = toIsoDate(periodEnd)
  const mappedTier =
    getBillingTierFromStripeSubscription(subscription) ?? getFallbackTierForSnapshot(snapshot)

  if (subscription.status === "canceled") {
    return {
      ...snapshot,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
      stripe_subscription_id: null,
      subscription_tier: "free",
      subscription_status: "canceled",
      subscription_current_period_end: periodEndIso,
      subscription_cancel_at_period_end: false,
    }
  }

  return {
    ...snapshot,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : null,
    stripe_subscription_id: subscription.id,
    subscription_tier: mappedTier ?? snapshot.subscription_tier ?? "free",
    subscription_status: subscription.status,
    subscription_current_period_end: periodEndIso,
    subscription_cancel_at_period_end: subscription.cancel_at_period_end,
  }
}

export async function synchronizeOrganizationBillingSnapshot(
  organizationId: string
): Promise<OrganizationBillingSnapshot | null> {
  const adminClient = createAdminClient()
  const { data: snapshot, error } = await adminClient
    .from("organizations")
    .select(
      "id, stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status, subscription_current_period_end, subscription_cancel_at_period_end"
    )
    .eq("id", organizationId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!snapshot) {
    return null
  }

  if (!snapshot.stripe_customer_id && !snapshot.stripe_subscription_id) {
    return snapshot
  }

  const stripe = createStripeClient()
  const directSubscription = await getStripeSubscriptionById(stripe, snapshot.stripe_subscription_id)
  const customerSubscriptions = snapshot.stripe_customer_id
    ? await stripe.subscriptions.list({
        customer: snapshot.stripe_customer_id,
        status: "all",
        limit: 20,
      })
    : null
  const resolvedSubscription = getRelevantStripeSubscription(
    [
      ...(directSubscription ? [directSubscription] : []),
      ...(customerSubscriptions?.data ?? []),
    ],
    snapshot.id,
    snapshot.stripe_subscription_id
  )

  const synchronizedSnapshot = buildSynchronizedBillingSnapshot(snapshot, resolvedSubscription)

  const { error: updateError } = await adminClient
    .from("organizations")
    .update({
      stripe_customer_id: synchronizedSnapshot.stripe_customer_id,
      stripe_subscription_id: synchronizedSnapshot.stripe_subscription_id,
      subscription_tier: synchronizedSnapshot.subscription_tier,
      subscription_status: synchronizedSnapshot.subscription_status,
      subscription_current_period_end: synchronizedSnapshot.subscription_current_period_end,
      subscription_cancel_at_period_end:
        synchronizedSnapshot.subscription_cancel_at_period_end ?? false,
    })
    .eq("id", organizationId)

  if (updateError) {
    throw updateError
  }

  return synchronizedSnapshot
}

export function getBillingTierFromStripeSubscription(
  subscription: Stripe.Subscription
): Exclude<BillingTierKey, "free"> | null {
  const primaryPrice = subscription.items.data[0]?.price
  const mappedTier = getBillingTierForStripePlan(primaryPrice?.id, getPriceProductId(primaryPrice))

  if (mappedTier) {
    return mappedTier
  }

  const metadataTier = subscription.metadata.subscription_tier?.trim().toLowerCase()
  if (metadataTier === "starter" || metadataTier === "pro") {
    return metadataTier
  }

  return null
}
