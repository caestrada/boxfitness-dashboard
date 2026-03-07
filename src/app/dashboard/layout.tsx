import Link from "next/link"
import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { Building2 } from "lucide-react"

import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { NavUser } from "@/components/dashboard/nav-user"
import { SetupPanel } from "@/components/setup/setup-panel"
import { Button } from "@/components/ui/button"
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
      <main className="mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16 md:px-10">
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

      <SidebarInset className="px-3 pb-3 pt-3 md:px-4 md:pb-4 md:pt-4">
        <div className="app-frame relative flex min-h-[calc(100svh-1.5rem)] flex-1 flex-col overflow-hidden md:min-h-[calc(100svh-2rem)]">
          <div
            aria-hidden="true"
            className="dot-grid absolute inset-0 opacity-35 [mask-image:linear-gradient(180deg,white,transparent_72%)]"
          />
          <div
            aria-hidden="true"
            className="absolute left-10 top-0 h-40 w-40 rounded-full bg-primary/12 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute right-10 top-10 h-36 w-36 rounded-full bg-slate-300/35 blur-3xl dark:bg-sky-400/10"
          />

          <header className="sticky top-0 z-20 border-b border-border/70 bg-white/64 backdrop-blur-xl dark:bg-sidebar/72">
            <div className="flex min-h-20 flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div className="flex min-w-0 items-center gap-3 md:gap-4">
                <SidebarTrigger />
                <div className="min-w-0">
                  <p className="section-label">Studio Control Plane</p>
                  <p className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
                    {gyms.length > 0
                      ? `${gyms.length} gym workspace${gyms.length > 1 ? "s" : ""} connected`
                      : "Create your first gym workspace"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/gyms/new">
                    New gym
                    <Building2 className="size-4" />
                  </Link>
                </Button>
                <NavUser user={profile} />
              </div>
            </div>
          </header>

          <div className="relative flex flex-1 flex-col px-4 py-5 md:px-6 md:py-6">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
