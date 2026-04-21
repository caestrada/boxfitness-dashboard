import { redirect } from "next/navigation"

import {
  parseDashboardGyms,
  parseDashboardProfile,
  resolveActiveGym,
} from "@/lib/dashboard"
import { parseMemberDirectoryRows } from "@/lib/members"
import { createClient } from "@/lib/supabase/server"

export async function getScopedMemberRecord(
  membershipId: string,
  redirectPath: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth?redirectTo=${redirectPath}`)
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
  ])

  const gyms = parseDashboardGyms(gymRows)
  const profile = parseDashboardProfile(profileRow, user.email ?? null)
  const activeGym = resolveActiveGym(gyms, profile.defaultOrganizationId)

  if (!activeGym) {
    return {
      activeGym: null,
      member: null,
    }
  }

  const { data } = await supabase
    .from("member_organizations")
    .select(
      "id, organization_id, status, membership_plan, joined_at, last_visit_at, outstanding_balance_cents, member:members!member_organizations_member_id_fkey(id, full_name, email, phone)"
    )
    .eq("organization_id", activeGym.id)
    .eq("id", membershipId)
    .maybeSingle()

  return {
    activeGym,
    member: parseMemberDirectoryRows(data ? [data] : [])[0] ?? null,
  }
}
