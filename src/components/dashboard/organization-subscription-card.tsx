"use client"

import Link from "next/link"
import { startTransition, useEffect, useRef, useState } from "react"
import {
  Check,
  ChevronDown,
  CreditCard,
  ExternalLink,
  LoaderCircle,
  RotateCcw,
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
  DialogFooter,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  billingSyncFailed?: boolean
}

const billingDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
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

function getSubscriptionTimelineLabel(
  tier: BillingTierKey,
  formattedPeriodEnd: string | null,
  subscriptionCancelAtPeriodEnd: boolean
) {
  if (subscriptionCancelAtPeriodEnd && tier !== "free" && formattedPeriodEnd) {
    return `Your plan changes to Free on ${formattedPeriodEnd}`
  }

  if (tier === "free") {
    return formattedPeriodEnd
      ? `Your previous billing period ended on ${formattedPeriodEnd}`
      : "Your workspace is currently on Free"
  }

  if (formattedPeriodEnd) {
    return `Renews on ${formattedPeriodEnd}`
  }

  return "Your workspace has full access on this plan"
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
  billingSyncFailed = false,
}: OrganizationSubscriptionCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [plansOpen, setPlansOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [renewConfirmOpen, setRenewConfirmOpen] = useState(false)
  const [pendingTier, setPendingTier] = useState<Exclude<BillingTierKey, "free"> | null>(null)
  const [portalTarget, setPortalTarget] = useState<"manage" | BillingTierKey | null>(null)
  const [cancelPending, setCancelPending] = useState(false)
  const [renewPending, setRenewPending] = useState(false)
  const [optimisticCancelAtPeriodEnd, setOptimisticCancelAtPeriodEnd] = useState(false)
  const handledBillingStateRef = useRef<string | null>(null)

  const displayOrganization = organization
    ? {
        ...organization,
        subscriptionCancelAtPeriodEnd:
          organization.subscriptionCancelAtPeriodEnd || optimisticCancelAtPeriodEnd,
      }
    : null
  const currentTier = getCurrentBillingTier(displayOrganization)
  const currentPlan = BILLING_PLAN_DEFINITIONS[currentTier]
  const statusMeta = getBillingStatusMeta(displayOrganization)
  const formattedPeriodEnd = formatBillingDate(
    displayOrganization?.subscriptionCurrentPeriodEnd ?? null
  )
  const isOwner = organization?.role === "owner"
  const canManageBilling = Boolean(organization && isOwner)
  const canOpenPortal = Boolean(
    organization &&
      currentTier !== "free" &&
      canManageBilling &&
      billingConfigured &&
      organization.stripeCustomerId
  )
  const portalPending = portalTarget !== null
  const actionPending = portalPending || renewPending || cancelPending
  const requiresPortalForPlanChanges = currentTier !== "free"
  const isScheduledCancellation = Boolean(
    displayOrganization?.subscriptionCancelAtPeriodEnd && currentTier !== "free"
  )
  const subscriptionTimelineLabel = getSubscriptionTimelineLabel(
    currentTier,
    formattedPeriodEnd,
    Boolean(displayOrganization?.subscriptionCancelAtPeriodEnd)
  )
  const showManageMenu = Boolean(organization && currentTier !== "free")
  const showRenewAction = isScheduledCancellation
  const renewConfirmationLabel = formattedPeriodEnd
    ? `Your current ${currentPlan.name} subscription will auto-renew on ${formattedPeriodEnd}.`
    : `Your current ${currentPlan.name} subscription will continue renewing automatically.`
  const cancelConfirmationLabel = formattedPeriodEnd
    ? `Your current ${currentPlan.name} subscription will end on ${formattedPeriodEnd}.`
    : `Your current ${currentPlan.name} subscription will end at the close of the current billing period.`

  useEffect(() => {
    const billingState = searchParams.get("billing")

    if (!billingState || handledBillingStateRef.current === billingState) {
      return
    }

    handledBillingStateRef.current = billingState

    if (billingState === "success") {
      toast.success("Checkout completed. Stripe may take a few seconds to sync the updated plan.")
    } else if (billingState === "plan-updated") {
      toast.success("Plan change confirmed. Stripe may take a few seconds to sync the update.")
    } else if (billingState === "cancel-scheduled") {
      setOptimisticCancelAtPeriodEnd(true)
      toast.success("Cancellation scheduled. The workspace stays paid until the current period ends.")
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
      router.refresh()
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

  async function handleManageSubscription(targetTier?: BillingTierKey) {
    if (!organization) {
      return
    }

    setPortalTarget(targetTier ?? "manage")

    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organization.id,
          targetTier,
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
      setPortalTarget(null)
    }
  }

  async function handleRenewSubscription() {
    if (!organization) {
      return
    }

    setRenewPending(true)

    try {
      const response = await fetch("/api/billing/renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new BillingRequestError(
          response.status,
          payload?.message ?? "The plan could not be renewed."
        )
      }

      setRenewConfirmOpen(false)
      setOptimisticCancelAtPeriodEnd(false)
      toast.success(`${currentPlan.name} plan renewed.`)

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      if (error instanceof BillingRequestError && error.status === 409) {
        startTransition(() => {
          router.refresh()
        })
      }

      const message = error instanceof Error ? error.message : "The plan could not be renewed."
      toast.error(message)
    } finally {
      setRenewPending(false)
    }
  }

  async function handleCancelSubscription() {
    if (!organization) {
      return
    }

    setCancelPending(true)

    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId: organization.id,
        }),
      })
      const payload = (await response.json().catch(() => null)) as { message?: string } | null

      if (!response.ok) {
        throw new BillingRequestError(
          response.status,
          payload?.message ?? "The plan could not be canceled."
        )
      }

      setCancelConfirmOpen(false)
      setOptimisticCancelAtPeriodEnd(true)
      toast.success("Cancellation scheduled.")

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      if (error instanceof BillingRequestError && error.status === 409) {
        startTransition(() => {
          router.refresh()
        })
      }

      const message = error instanceof Error ? error.message : "The plan could not be canceled."
      toast.error(message)
    } finally {
      setCancelPending(false)
    }
  }

  function renderPlanAction(tierKey: BillingTierKey) {
    const isCurrentPlan = tierKey === currentTier

    if (isCurrentPlan) {
      return (
        <Button className="w-full" disabled size="sm" variant="outline">
          Your current plan
        </Button>
      )
    }

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

    if (requiresPortalForPlanChanges) {
      const planActionLabel =
        tierKey === "free"
          ? "Downgrade to Free"
          : `Switch to ${BILLING_PLAN_DEFINITIONS[tierKey].name}`
      const isPlanPortalPending = portalTarget === tierKey

      return (
        <Button
          className="w-full"
          disabled={!canOpenPortal || portalPending}
          onClick={() => handleManageSubscription(tierKey)}
          size="sm"
          variant="outline"
        >
          {isPlanPortalPending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Redirecting...
            </>
          ) : canOpenPortal ? (
            <>
              {planActionLabel}
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
          Your current plan
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
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
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

                  <div className="space-y-3 pt-1">
                    <div className="space-y-1">
                      <p className="text-4xl font-semibold tracking-[-0.05em] text-foreground">
                        {`${currentPlan.name} Plan`}
                      </p>
                      <p className="text-lg text-muted-foreground">
                        {subscriptionTimelineLabel}
                      </p>
                    </div>

                    <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
                      {currentTier === "free"
                        ? currentPlan.description
                        : `${currentPlan.description} $${currentPlan.monthlyPrice}/month.`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {showManageMenu ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="min-w-[11rem] justify-between px-5 shadow-none"
                          disabled={!canManageBilling || !billingConfigured || actionPending}
                          size="lg"
                          variant="outline"
                        >
                          {actionPending ? (
                            <>
                              <LoaderCircle className="size-4 animate-spin" />
                              Working...
                            </>
                          ) : (
                            <>
                              Manage
                              <ChevronDown className="size-4" />
                            </>
                          )}
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent align="end" className="w-80 rounded-[2rem] p-3">
                        <DropdownMenuItem
                          className="surface-control gap-3 rounded-[1.25rem] px-5 py-4 text-[1.05rem]"
                          onSelect={() => setPlansOpen(true)}
                        >
                          <CreditCard className="size-4" />
                          <span className="font-medium">Change plan</span>
                        </DropdownMenuItem>

                        {showRenewAction ? (
                          <DropdownMenuItem
                            className="mt-2 gap-3 rounded-[1.25rem] px-5 py-4 text-[1.05rem]"
                            disabled={!canOpenPortal || renewPending}
                            onSelect={() => setRenewConfirmOpen(true)}
                          >
                            <RotateCcw className="size-4" />
                            <span className="font-medium">{`Renew ${currentPlan.name} Plan`}</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="mt-2 gap-3 rounded-[1.25rem] px-5 py-4 text-[1.05rem]"
                            disabled={!canOpenPortal || cancelPending}
                            onSelect={() => setCancelConfirmOpen(true)}
                          >
                            <ShieldAlert className="size-4" />
                            <span className="font-medium">Cancel subscription</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      disabled={!canManageBilling || !billingConfigured}
                      onClick={() => setPlansOpen(true)}
                      size="sm"
                    >
                      See plans
                    </Button>
                  )}
                </div>
              </div>

              {currentTier !== "free" && !isScheduledCancellation ? (
                <div className="app-subpanel p-4">
                  <p className="text-sm leading-7 text-muted-foreground">
                    {`Thanks for subscribing to ${currentPlan.name} Plan. ${currentPlan.features[0]}.`}
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

              {billingSyncFailed ? (
                <div className="rounded-[1.5rem] border border-amber-500/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-800 dark:text-amber-200">
                  Stripe billing could not be refreshed during this page load, so the
                  subscription state shown here may be stale.
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog onOpenChange={setPlansOpen} open={plansOpen}>
        <DialogContent className="max-h-[88svh] overflow-y-auto">
          <DialogHeader className="items-center text-center">
            <DialogTitle>Choose your plan</DialogTitle>
            <DialogDescription>
              {organization
                ? `Billing applies to ${organization.name}. Choose a plan below and confirm any paid-plan changes in Stripe.`
                : "Select the Box Fitness plan that matches your current workspace needs."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-3">
            {BILLING_TIER_KEYS.map((tierKey) => {
              const plan = BILLING_PLAN_DEFINITIONS[tierKey]
              const isCurrentPlan = tierKey === currentTier

              return (
                <div
                  key={tierKey}
                  className={cn(
                    "relative flex flex-col rounded-[1.75rem] border border-border/70 bg-card p-6 pt-8 shadow-[0_20px_48px_-36px_rgba(15,23,42,0.18)]",
                    isCurrentPlan && "border-primary/40 bg-primary/[0.06]"
                  )}
                >
                  {isCurrentPlan ? (
                    <div className="pointer-events-none absolute inset-x-0 top-0 flex -translate-y-1/2 justify-center">
                      <div className="rounded-full border border-primary/25 bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-primary shadow-sm">
                        Current plan
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-[2rem] font-semibold tracking-[-0.04em] text-foreground">
                      {plan.name}
                    </p>
                    <div className="mt-4 flex items-start gap-2">
                      <span className="pt-1 text-sm text-muted-foreground">$</span>
                      <p className="text-5xl font-semibold tracking-[-0.06em] text-foreground">
                        {plan.monthlyPrice}
                      </p>
                      <span className="pt-3 text-sm leading-5 text-muted-foreground">
                        USD / month
                      </span>
                    </div>
                    <div className="mt-6">{renderPlanAction(tierKey)}</div>
                    <p className="mt-4 min-h-[6rem] text-base leading-7 text-foreground/85">
                      {plan.description}
                    </p>
                  </div>

                  <div className="mt-7 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                        <Check className="mt-1 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

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

        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setRenewConfirmOpen} open={renewConfirmOpen}>
        <DialogContent className="w-[min(calc(100vw-2rem),56rem)]">
          <DialogHeader className="pr-14">
            <DialogTitle>Confirm plan changes</DialogTitle>
            <DialogDescription className="pt-3 text-lg leading-8 text-foreground/85">
              {renewConfirmationLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[1.75rem] border border-border/70 bg-secondary/30 p-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {`${currentPlan.name} Plan`}
                </p>
                <p className="mt-2 text-lg text-muted-foreground">
                  {formattedPeriodEnd
                    ? `Billing will auto-renew on ${formattedPeriodEnd}`
                    : "Billing will continue renewing automatically"}
                </p>
              </div>

              <p className="text-2xl font-medium tracking-[-0.03em] text-muted-foreground">
                {`USD $${currentPlan.monthlyPrice}/month`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={renewPending}
              onClick={() => setRenewConfirmOpen(false)}
              size="lg"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={renewPending} onClick={handleRenewSubscription} size="lg">
              {renewPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setCancelConfirmOpen} open={cancelConfirmOpen}>
        <DialogContent className="w-[min(calc(100vw-2rem),56rem)]">
          <DialogHeader className="pr-14">
            <DialogTitle>Confirm plan changes</DialogTitle>
            <DialogDescription className="pt-3 text-lg leading-8 text-foreground/85">
              {cancelConfirmationLabel}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[1.75rem] border border-border/70 bg-secondary/30 p-5">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {`${currentPlan.name} Plan`}
                </p>
                <p className="mt-2 text-lg text-muted-foreground">
                  {formattedPeriodEnd
                    ? `Service will end on ${formattedPeriodEnd}`
                    : "Service will end at the close of the current billing period"}
                </p>
              </div>

              <p className="text-2xl font-medium tracking-[-0.03em] text-muted-foreground">
                {`USD $${currentPlan.monthlyPrice}/month`}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={cancelPending}
              onClick={() => setCancelConfirmOpen(false)}
              size="lg"
              variant="outline"
            >
              Keep plan
            </Button>
            <Button disabled={cancelPending} onClick={handleCancelSubscription} size="lg">
              {cancelPending ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
