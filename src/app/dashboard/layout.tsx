import type { ReactNode } from "react"
import { redirect } from "next/navigation"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { NavUser } from "@/components/dashboard/nav-user"
import { SetupPanel } from "@/components/setup/setup-panel"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { hasSupabaseEnv } from "@/lib/env"
import {
  parseDashboardGyms,
  parseDashboardProfile,
} from "@/lib/dashboard"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  if (!hasSupabaseEnv()) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16 md:px-10">
        <SetupPanel />
      </main>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?redirectTo=/dashboard")
  }

  const [profileResult, gymsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle(),
    supabase.from("organizations").select("id, name, slug").is("archived_at", null).order("name"),
  ])

  const profile = parseDashboardProfile(profileResult.data, user.email ?? null)
  const gyms = parseDashboardGyms(gymsResult.data)

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar gyms={gyms} />

      <SidebarInset className="bg-[radial-gradient(circle_at_top,_hsl(18_100%_55%_/_0.08),_transparent_34%)]">
        <div className="flex flex-1 flex-col px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4">
          <header className="sticky top-3 z-20 md:top-4">
            <div className="relative flex min-h-[5.5rem] flex-col gap-4 overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,hsl(228_17%_12%_/_0.96),hsl(228_16%_9%_/_0.92))] px-4 py-4 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-white/14 via-white/6 to-transparent"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-primary/0 via-primary/35 to-cyan-300/35"
              />
              <div
                aria-hidden="true"
                className="absolute left-[-8%] top-[-70%] h-40 w-40 rounded-full bg-primary/12 blur-3xl"
              />
              <div
                aria-hidden="true"
                className="absolute right-[-6%] top-[-55%] h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl"
              />

              <div className="relative flex min-w-0 items-center gap-3 md:gap-4">
                <SidebarTrigger />
                <div className="min-w-0">
                  <p className="font-mono text-[11px] uppercase tracking-[0.36em] text-primary/80">
                    Operations
                  </p>
                  <p className="truncate text-base font-medium tracking-[-0.01em] text-foreground/90">
                    Gym-aware dashboard shell
                  </p>
                </div>
              </div>

              <div className="relative sm:shrink-0">
                <NavUser user={profile} />
              </div>
            </div>
          </header>

          <div className="flex flex-1 flex-col px-1 pt-5 md:px-2 md:pt-6">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
