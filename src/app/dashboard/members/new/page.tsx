import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft, UserPlus } from "lucide-react"

import { AddMemberForm } from "@/components/dashboard/add-member-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  parseDashboardGyms,
  parseDashboardProfile,
  resolveActiveGym,
} from "@/lib/dashboard"
import { createClient } from "@/lib/supabase/server"

export default async function NewMemberPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/members/new")
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

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <div className="flex items-center">
        <Button asChild variant="outline">
          <Link href="/dashboard/members">
            <ArrowLeft className="size-4" />
            Back to members
          </Link>
        </Button>
      </div>

      {activeGym ? (
        <>
          <Card className="border-border/70 bg-card">
            <CardHeader className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UserPlus className="size-5" />
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-2xl">Add member</CardTitle>
                  <CardDescription className="max-w-2xl leading-7">
                    Add a new member to {activeGym.name}. The record will be created
                    inside the current active gym workspace.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <AddMemberForm
            organizationId={activeGym.id}
            organizationName={activeGym.name}
          />
        </>
      ) : (
        <Card className="border-border/70 bg-card">
          <CardHeader>
            <CardTitle className="text-2xl">Create a gym first</CardTitle>
            <CardDescription className="leading-7">
              Members must be created inside an active gym workspace. Add a gym and
              set it as the active workspace before using this form.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
}
