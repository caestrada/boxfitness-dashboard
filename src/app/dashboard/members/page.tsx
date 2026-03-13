import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, Plus, Users } from "lucide-react"

import { columns } from "@/app/dashboard/members/columns"
import { DataTable } from "@/app/dashboard/members/data-table"
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
  const availablePlans = Array.from(
    new Set(
      memberRows
        .map((row) => row.membershipPlan)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right))

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <section className="app-panel relative overflow-hidden p-6 md:p-8">
        <div
          aria-hidden="true"
          className="absolute -right-10 top-2 h-36 w-36 rounded-full bg-primary/12 blur-3xl"
        />

        <div className="relative space-y-6">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Users className="size-4" />
                Members
              </div>
              {activeGym ? (
                <Button asChild>
                  <Link href="/dashboard/members/new">
                    <Plus className="size-4" />
                    Add Member
                  </Link>
                </Button>
              ) : null}
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-[-0.04em] text-balance md:text-5xl">
                {activeGym ? `${activeGym.name} members` : "Create a gym before loading members"}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
                {activeGym
                  ? hasSavedDefaultGym
                    ? "This datatable is scoped to your current default gym."
                    : "This datatable is using the fallback gym until a default gym is saved in Account Settings."
                  : "The members page activates once a gym workspace exists and can be loaded as the active workspace."}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="app-subpanel p-4">
              <p className="section-label">Current gym</p>
              <p className="mt-3 text-lg font-semibold text-foreground">
                {activeGym?.name ?? "No gym selected"}
              </p>
            </div>

            <div className="app-subpanel p-4">
              <p className="section-label">Active members</p>
              <p className="mt-3 text-lg font-semibold text-foreground">{activeMemberCount}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeGym
                  ? `${leadCount} leads currently attached to this gym`
                  : "Leads and active members are tracked per gym."}
              </p>
            </div>

            <div className="app-subpanel p-4">
              <p className="section-label">Outstanding balance</p>
              <p className="mt-3 text-lg font-semibold text-foreground">
                {formatCurrency(outstandingBalanceCents)}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Open balances shown here are limited to the active gym.
              </p>
            </div>
          </div>
        </div>
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
              All members for the active gym appear here with search, filters,
              sorting, and pagination.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              availablePlans={availablePlans}
              columns={columns}
              data={memberRows}
              emptyDescription={
                memberRows.length === 0
                  ? "This directory is scoped to the active gym workspace. Once member records are created for this gym, they will appear here."
                  : "Adjust the search, status, or plan filters to widen the directory."
              }
              emptyTitle={
                memberRows.length === 0
                  ? `No members have been added to ${activeGym.name} yet.`
                  : "No members match the current filters."
              }
              gymName={activeGym.name}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
