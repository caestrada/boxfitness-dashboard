"use client"

import Link from "next/link"
import { startTransition, useEffect, useRef, useState } from "react"
import {
  Check,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { BillingTierKey } from "@/lib/billing"
import {
  BILLING_PLAN_DEFINITIONS,
  BILLING_TIER_KEYS,
  getBillingStatusMeta,
  getCurrentBillingTier,
} from "@/lib/billing"
import type { DashboardBillingOrganization } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

interface OrganizationSubscriptionCardProps {
  organization: DashboardBillingOrganization | null
  billingConfigured: boolean
}

const billingDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function formatBillingDate(value: string | null) {
  if (!value) {
    return null
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return billingDateFormatter.format(parsedDate)
}

function getStatusBadgeClassName(tone: ReturnType<typeof getBillingStatusMeta>["tone"]) {
  switch (tone) {
    case "success":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    case "warning":
      return "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    case "info":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300"
    default:
      return "border-border/70 bg-secondary/75 text-muted-foreground"
  }
}

class BillingRequestError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "BillingRequestError"
    this.status = status
  }
}

async function getJsonPayload(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { message?: string; url?: string }
    | null

  if (!response.ok) {
    throw new BillingRequestError(
      response.status,
      payload?.message ?? "The request could not be completed."
    )
  }

  if (!payload?.url) {
    throw new Error("Stripe did not return a redirect URL.")
  }

  return { url: payload.url }
}

export function OrganizationSubscriptionCard({
  organization,
  billingConfigured,
}: OrganizationSubscriptionCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [plansOpen, setPlansOpen] = useState(false)
  const [pendingTier, setPendingTier] = useState<Exclude<BillingTierKey, "free"> | null>(null)
  const [portalPending, setPortalPending] = useState(false)
  const handledBillingStateRef = useRef<string | null>(null)

  const currentTier = getCurrentBillingTier(organization)
  const currentPlan = BILLING_PLAN_DEFINITIONS[currentTier]
  const statusMeta = getBillingStatusMeta(organization)
  const formattedPeriodEnd = formatBillingDate(organization?.subscriptionCurrentPeriodEnd ?? null)
  const isOwner = organization?.role === "owner"
  const canManageBilling = Boolean(organization && isOwner)
  const canOpenPortal = Boolean(
    organization &&
      currentTier !== "free" &&
      canManageBilling &&
      billingConfigured &&
      organization.stripeCustomerId
  )
  const requiresPortalForPlanChanges = currentTier !== "free"

  useEffect(() => {
    const billingState = searchParams.get("billing")

    if (!billingState || handledBillingStateRef.current === billingState) {
      return
    }

    handledBillingStateRef.current = billingState

    if (billingState === "success") {
      toast.success("Checkout completed. Stripe may take a few seconds to sync the updated plan.")
    } else if (billingState === "canceled") {
      toast.info("Checkout was canceled.")
    }

    const nextSearchParams = new URLSearchParams(searchParams.toString())
    nextSearchParams.delete("billing")
    const nextUrl = nextSearchParams.toString()
      ? `/dashboard/profile?${nextSearchParams.toString()}`
      : "/dashboard/profile"

    startTransition(() => {
      router.replace(nextUrl, { scroll: false })
    })
  }, [router, searchParams])

  async function handleCheckout(tier: Exclude<BillingTierKey, "free">) {
    if (!organization) {
      return
    }

    setPendingTier(tier)

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organization.id,
          tier,
        }),
      })
      const payload = await getJsonPayload(response)

      window.location.assign(payload.url)
    } catch (error) {
      if (error instanceof BillingRequestError && error.status === 409) {
        setPlansOpen(false)

        startTransition(() => {
          router.refresh()
        })
      }

      const message =
        error instanceof Error ? error.message : "Stripe Checkout could not be started."
      toast.error(message)
    } finally {
      setPendingTier(null)
    }
  }

  async function handleManageSubscription() {
    if (!organization) {
      return
    }

    setPortalPending(true)

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      })
      const payload = await getJsonPayload(response)

      window.location.assign(payload.url)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Stripe Billing Portal could not be opened."
      toast.error(message)
    } finally {
      setPortalPending(false)
    }
  }

  function renderPlanAction(tierKey: BillingTierKey) {
    const isCurrentPlan = tierKey === currentTier

    if (!canManageBilling) {
      return (
        <Button className="w-full" disabled size="sm" variant="outline">
          Owner managed
        </Button>
      )
    }

    if (!billingConfigured) {
      return (
        <Button className="w-full" disabled size="sm" variant="outline">
          Stripe setup required
        </Button>
      )
    }

    if (isCurrentPlan) {
      return (
        <Button className="w-full" disabled size="sm" variant="outline">
          Current plan
        </Button>
      )
    }

    if (requiresPortalForPlanChanges) {
      return (
        <Button
          className="w-full"
          disabled={!canOpenPortal || portalPending}
          onClick={handleManageSubscription}
          size="sm"
          variant="outline"
        >
          {portalPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Opening...
            </>
          ) : canOpenPortal ? (
            <>
              Manage in Stripe
              <ExternalLink className="size-4" />
            </>
          ) : (
            "Waiting for sync"
          )}
        </Button>
      )
    }

    if (tierKey === "free") {
      return (
        <Button className="w-full" disabled size="sm" variant="outline">
          Current plan
        </Button>
      )
    }

    const isPending = pendingTier === tierKey

    return (
      <Button
        className="w-full"
        disabled={isPending}
        onClick={() => handleCheckout(tierKey)}
        size="sm"
        variant="default"
      >
        {isPending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Redirecting...
          </>
        ) : (
          `Choose ${BILLING_PLAN_DEFINITIONS[tierKey].name}`
        )}
      </Button>
    )
  }

  return (
    <>
      <Card className="border-border/70 bg-card">
        <CardHeader className="space-y-3">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CreditCard className="size-5" />
            </div>

            <div className="space-y-2">
              <CardTitle className="text-2xl">Box Fitness Subscription</CardTitle>
              <CardDescription className="max-w-2xl leading-7">
                Manage your Box Fitness platform subscription for the active workspace.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {!organization ? (
            <div className="app-subpanel space-y-4 p-5">
              <p className="text-sm leading-7 text-muted-foreground">
                Create your first gym workspace before subscription management becomes
                available.
              </p>
              <Button asChild size="sm">
                <Link href="/dashboard/gyms/new">Create gym workspace</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="section-label">Active workspace</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                        {organization.name}
                      </p>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium",
                          getStatusBadgeClassName(statusMeta.tone)
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <p className="text-lg font-semibold text-foreground">
                        {currentPlan.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${currentPlan.monthlyPrice}/month
                      </p>
                    </div>
                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                      {currentPlan.description}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {canOpenPortal ? (
                    <Button
                      disabled={portalPending}
                      onClick={handleManageSubscription}
                      size="sm"
                      variant="outline"
                    >
                      {portalPending ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Opening...
                        </>
                      ) : (
                        <>
                          Manage
                          <ExternalLink className="size-4" />
                        </>
                      )}
                    </Button>
                  ) : null}

                  <Button
                    disabled={!canManageBilling || !billingConfigured}
                    onClick={() => setPlansOpen(true)}
                    size="sm"
                  >
                    {currentTier === "free" ? "See plans" : "Change plan"}
                  </Button>
                </div>
              </div>

              {formattedPeriodEnd ? (
                <div className="app-subpanel p-4">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {organization.subscriptionCancelAtPeriodEnd
                      ? `Scheduled to end on ${formattedPeriodEnd}.`
                      : currentTier === "free"
                        ? `Most recent billing period ended on ${formattedPeriodEnd}.`
                        : `Renews on ${formattedPeriodEnd}.`}
                  </p>
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                {currentPlan.features.slice(0, 4).map((feature) => (
                  <div key={feature} className="app-subpanel flex gap-3 p-4">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-4" />
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{feature}</p>
                  </div>
                ))}
              </div>

              {!canManageBilling ? (
                <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-800 dark:text-amber-200">
                  Only workspace owners can change plans or open Stripe billing.
                </div>
              ) : null}

              {canManageBilling && !billingConfigured ? (
                <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-800 dark:text-amber-200">
                  Stripe billing is not fully configured in this environment yet. Add
                  the Stripe and Supabase admin environment variables to enable plan
                  changes.
                </div>
              ) : null}

              {canManageBilling &&
              billingConfigured &&
              currentTier !== "free" &&
              !organization.stripeCustomerId ? (
                <div className="rounded-[1.5rem] border border-sky-500/20 bg-sky-500/10 p-4 text-sm leading-7 text-sky-800 dark:text-sky-200">
                  Stripe is still syncing this subscription. Portal access will unlock as
                  soon as the webhook updates the workspace record.
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog onOpenChange={setPlansOpen} open={plansOpen}>
        <DialogContent className="max-h-[88svh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Choose a subscription plan</DialogTitle>
            <DialogDescription>
              {organization
                ? `Billing applies to ${organization.name}. Owners can start a new subscription from Free or manage an existing paid plan in Stripe.`
                : "Select the Box Fitness plan that matches your current workspace needs."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-3">
            {BILLING_TIER_KEYS.map((tierKey) => {
              const plan = BILLING_PLAN_DEFINITIONS[tierKey]
              const isCurrentPlan = tierKey === currentTier
              const isFeatured = tierKey === "starter"

              return (
                <div
                  key={tierKey}
                  className={cn(
                    "flex flex-col rounded-[1.75rem] border border-border/70 bg-card p-5 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.35)]",
                    isCurrentPlan &&
                      "border-primary/30 bg-primary/10 shadow-[0_24px_56px_-34px_rgba(255,107,44,0.35)]"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-foreground">{plan.name}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>

                    {isFeatured ? (
                      <span className="rounded-full bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
                        Popular
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <p className="text-3xl font-semibold tracking-[-0.04em] text-foreground">
                      ${plan.monthlyPrice}
                      <span className="ml-1 text-sm font-medium text-muted-foreground">
                        /month
                      </span>
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                        <Check className="mt-1 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6">{renderPlanAction(tierKey)}</div>
                </div>
              )
            })}
          </div>

          {organization && requiresPortalForPlanChanges ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-secondary/45 p-4 text-sm leading-7 text-muted-foreground">
              Existing paid subscriptions are changed inside Stripe Billing Portal so the
              workspace never ends up with duplicate subscriptions.
            </div>
          ) : null}

          {!organization ? (
            <div className="rounded-[1.5rem] border border-border/70 bg-secondary/45 p-4 text-sm leading-7 text-muted-foreground">
              Select a workspace first to subscribe.
            </div>
          ) : null}

          {!canManageBilling && organization ? (
            <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-800 dark:text-amber-200">
              Workspace billing is limited to owners.
            </div>
          ) : null}

          <div className="flex items-start gap-3 rounded-[1.5rem] border border-border/70 bg-secondary/45 p-4 text-sm leading-7 text-muted-foreground">
            <ShieldAlert className="mt-1 size-4 shrink-0 text-primary" />
            <p>
              Free workspaces can start Stripe Checkout here. Once a paid plan exists,
              ongoing upgrades, downgrades, and cancellations stay inside Stripe.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
