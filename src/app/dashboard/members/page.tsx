import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { columns } from "@/app/dashboard/members/columns";
import { DataTable } from "@/app/dashboard/members/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  parseDashboardGyms,
  parseDashboardProfile,
  resolveActiveGym,
} from "@/lib/dashboard";
import { parseMemberDirectoryRows } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";

function getMembersTableErrorMessage(message: string) {
  if (message.includes("member_organizations") || message.includes("members")) {
    return "This Supabase project is missing the members directory tables. Apply the latest migrations in `supabase/migrations/` and reload the page.";
  }

  return "The members directory could not be loaded for this gym.";
}

export default async function MembersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/members");
  }

  const [{ data: profileRow }, { data: gymRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name, avatar_url, default_organization_id")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, name, slug")
      .is("archived_at", null)
      .order("name"),
  ]);

  const gyms = parseDashboardGyms(gymRows);
  const profile = parseDashboardProfile(profileRow, user.email ?? null);
  const activeGym = resolveActiveGym(gyms, profile.defaultOrganizationId);
  let membersError: string | null = null;
  let memberRows = [] as ReturnType<typeof parseMemberDirectoryRows>;

  if (activeGym) {
    const { data, error } = await supabase
      .from("member_organizations")
      .select(
        "id, organization_id, status, membership_plan, joined_at, last_visit_at, outstanding_balance_cents, member:members!member_organizations_member_id_fkey(id, full_name, email, phone)",
      )
      .eq("organization_id", activeGym.id)
      .order("joined_at", { ascending: false });

    if (error) {
      membersError = getMembersTableErrorMessage(error.message);
    } else {
      memberRows = parseMemberDirectoryRows(data);
    }
  }

  const availablePlans = Array.from(
    new Set(
      memberRows
        .map((row) => row.membershipPlan)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) => left.localeCompare(right));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      {!activeGym ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Create the first gym workspace
            </CardTitle>
            <CardDescription className="leading-7">
              Members are always loaded within a gym context. Add a gym first,
              then this page can anchor the directory to that workspace.
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
            <CardTitle className="text-2xl">
              Members migration required
            </CardTitle>
            <CardDescription className="leading-7">
              {membersError}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="relative gap-4 sm:pr-40">
            <div className="space-y-2">
              <CardTitle className="text-2xl">Member Directory</CardTitle>
              <CardDescription className="leading-7">
                All members for the active gym appear here with search, filters,
                sorting, and pagination.
              </CardDescription>
            </div>
            <Button
              asChild
              className="self-start sm:absolute sm:top-6 sm:right-6"
            >
              <Link href="/dashboard/members/new">
                <Plus className="size-4" />
                Add Member
              </Link>
            </Button>
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
  );
}
