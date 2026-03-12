import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Building2, ShieldCheck, Users } from "lucide-react"

import { MembersTable } from "@/components/dashboard/members-table"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  parseDashboardGyms,
  parseDashboardProfile,
  resolveActiveGym,
} from "@/lib/dashboard"
import { parseMemberDirectoryRows } from "@/lib/members"
import { createClient } from "@/lib/supabase/server"

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(valueInCents / 100)
}

function getMembersTableErrorMessage(message: string) {
  if (message.includes("member_organizations") || message.includes("members")) {
    return "This Supabase project is missing the members directory tables. Apply the latest migrations in `supabase/migrations/` and reload the page."
  }

  return "The members directory could not be loaded for this gym."
}

export default async function MembersPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/members")
  }

  const [{ data: profileRow }, { data: gymRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name, avatar_url, default_organization_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("organizations").select("id, name, slug").is("archived_at", null).order("name"),
  ])

  const gyms = parseDashboardGyms(gymRows)
  const profile = parseDashboardProfile(profileRow, user.email ?? null)
  const activeGym = resolveActiveGym(gyms, profile.defaultOrganizationId)
  const hasSavedDefaultGym = Boolean(profile.defaultOrganizationId)
  let membersError: string | null = null
  let memberRows = [] as ReturnType<typeof parseMemberDirectoryRows>

  if (activeGym) {
    const { data, error } = await supabase
      .from("member_organizations")
      .select(
        "id, status, membership_plan, joined_at, last_visit_at, outstanding_balance_cents, member:members!member_organizations_member_id_fkey(id, full_name, email, phone)"
      )
      .eq("organization_id", activeGym.id)
      .order("joined_at", { ascending: false })

    if (error) {
      membersError = getMembersTableErrorMessage(error.message)
    } else {
      memberRows = parseMemberDirectoryRows(data)
    }
  }

  const activeMemberCount = memberRows.filter((row) => row.status === "active").length
  const leadCount = memberRows.filter((row) => row.status === "lead").length
  const outstandingBalanceCents = memberRows.reduce(
    (total, row) => total + row.outstandingBalanceCents,
    0
  )

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="app-panel relative overflow-hidden p-8 md:p-10">
          <div
            aria-hidden="true"
            className="absolute -right-10 top-2 h-36 w-36 rounded-full bg-primary/12 blur-3xl"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Users className="size-4" />
              Gym-scoped members
            </div>

            <div className="mt-6 max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance md:text-6xl">
                {activeGym
                  ? `${activeGym.name} member directory`
                  : "Create a gym before loading members"}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                {activeGym
                  ? "Members stay attached to the active gym workspace so staff, billing, and reporting all read from the same organization boundary."
                  : "The members module activates once a gym workspace exists and can be selected from the switcher."}
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <div className="app-subpanel p-4">
                <p className="section-label">Current gym</p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  {activeGym?.name ?? "No gym selected"}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeGym
                    ? hasSavedDefaultGym
                      ? "Directory resolved from your saved default gym."
                      : "Directory currently uses the fallback workspace until a default gym is saved."
                    : "Create and set a default gym to scope members correctly."}
                </p>
              </div>

              <div className="app-subpanel p-4">
                <p className="section-label">Active members</p>
                <p className="mt-3 text-lg font-semibold text-foreground">{activeMemberCount}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeGym
                    ? `${leadCount} leads waiting in this gym pipeline`
                    : "Leads and active members are tracked per gym."}
                </p>
              </div>

              <div className="app-subpanel p-4">
                <p className="section-label">Outstanding balance</p>
                <p className="mt-3 text-lg font-semibold text-foreground">
                  {formatCurrency(outstandingBalanceCents)}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Open balances shown here are limited to the selected gym.
                </p>
              </div>
            </div>
          </div>
        </div>

        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="text-2xl">Boundary rules</CardTitle>
            <CardDescription className="leading-7">
              This first pass keeps the members directory aligned with the
              organization workspace model already used across the dashboard shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="app-subpanel flex gap-4 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Gym-first by default</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Owners can belong to multiple gyms, but the members table stays scoped
                  to the active gym to avoid mixing locations.
                </p>
              </div>
            </div>

            <div className="app-subpanel flex gap-4 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Users className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Shared person record</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The schema separates a member person record from the
                  organization-specific membership so future multi-gym rollups stay
                  possible without changing the default UX.
                </p>
              </div>
            </div>

            <div className="app-subpanel flex gap-4 p-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">RLS stays aligned</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Reads flow through the same organization membership checks already used
                  elsewhere in the dashboard.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {!activeGym ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create the first gym workspace</CardTitle>
            <CardDescription className="leading-7">
              Members are always loaded within a gym context. Add a gym first, then this
              page can anchor the directory to that workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/gyms/new">
                Create new gym
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : membersError ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Members migration required</CardTitle>
            <CardDescription className="leading-7">{membersError}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Members datatable</CardTitle>
            <CardDescription className="leading-7">
              Search and filter within the active gym workspace. A future owner rollup
              can sit above this without changing the default member boundary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MembersTable gymName={activeGym.name} rows={memberRows} />
          </CardContent>
        </Card>
      )}

      {activeGym ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Next build steps</CardTitle>
            <CardDescription className="leading-7">
              The directory is now scoped to the selected gym. The next slices should
              build on that same contract.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="app-subpanel p-4 text-sm leading-7 text-muted-foreground">
              Add member create and edit flows that insert a person record plus an
              organization membership record in one transaction.
            </div>
            <div className="app-subpanel p-4 text-sm leading-7 text-muted-foreground">
              Attach attendance and visit history to the organization membership row so
              last-visit reporting stays gym-aware.
            </div>
            <div className="app-subpanel p-4 text-sm leading-7 text-muted-foreground">
              Add an owner-level all-gyms rollup later as an explicit reporting filter,
              not the default members source of truth.
            </div>
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
