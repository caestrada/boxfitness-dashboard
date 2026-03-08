import { NextResponse } from "next/server"
import { z } from "zod/v3"

import {
  createStripeClient,
  hasStripeBillingEnv,
  MISSING_STRIPE_BILLING_ENV_MESSAGE,
} from "@/lib/billing-server"
import { getRequestOrigin } from "@/lib/url"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

const createPortalBodySchema = z.object({
  organizationId: z.string().uuid("Select a valid workspace before opening billing."),
})

function createErrorResponse(status: number, message: string) {
  return NextResponse.json({ message }, { status })
}

export async function POST(request: Request) {
  if (!hasStripeBillingEnv()) {
    return createErrorResponse(503, MISSING_STRIPE_BILLING_ENV_MESSAGE)
  }

  let payload: z.infer<typeof createPortalBodySchema>

  try {
    payload = createPortalBodySchema.parse(await request.json())
  } catch {
    return createErrorResponse(400, "Choose a valid workspace before opening billing.")
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return createErrorResponse(401, "You must be signed in to manage billing.")
  }

  const [{ data: membership }, { data: organization, error: organizationError }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("role, status")
      .eq("organization_id", payload.organizationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, slug, stripe_customer_id")
      .eq("id", payload.organizationId)
      .is("archived_at", null)
      .maybeSingle(),
  ])

  if (organizationError) {
    return createErrorResponse(500, organizationError.message)
  }

  if (!organization || !membership) {
    return createErrorResponse(404, "The selected workspace could not be found.")
  }

  if (membership.role !== "owner") {
    return createErrorResponse(403, "Only workspace owners can manage billing.")
  }

  if (!organization.stripe_customer_id) {
    return createErrorResponse(
      409,
      "This workspace does not have a synced Stripe customer yet. Wait for billing sync, then try again."
    )
  }

  const stripe = createStripeClient()

  try {
    const returnUrl = new URL("/dashboard/profile", await getRequestOrigin())
    returnUrl.searchParams.set("gym", organization.slug)

    const session = await stripe.billingPortal.sessions.create({
      customer: organization.stripe_customer_id,
      return_url: returnUrl.toString(),
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe Billing Portal could not be opened."
    return createErrorResponse(500, message)
  }
}
