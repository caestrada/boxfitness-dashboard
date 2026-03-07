import { redirect } from "next/navigation"

import { ProfileCard } from "@/components/dashboard/profile-card"
import { ThemePreferenceCard } from "@/components/dashboard/theme-preference-card"
import { parseDashboardProfile } from "@/lib/dashboard"
import { createClient } from "@/lib/supabase/server"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/profile")
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("email, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const profile = parseDashboardProfile(profileRow, user.email ?? null)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <ProfileCard user={profile} />

      <ThemePreferenceCard />
    </div>
  )
}
