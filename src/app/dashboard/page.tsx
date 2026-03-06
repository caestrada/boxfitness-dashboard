import { format } from "date-fns"
import {
  Cloud,
  Database,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { redirect } from "next/navigation"

import { signOutAction } from "@/app/auth/actions"
import { SetupPanel } from "@/components/setup/setup-panel"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSupabaseProjectHost, hasSupabaseEnv } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"

const summaryCards = [
  {
    title: "Protected route",
    description:
      "This page is guarded in both the proxy layer and on the server component itself.",
    icon: ShieldCheck,
  },
  {
    title: "Cloud project target",
    description:
      "Everything here is wired for a fresh Supabase cloud project, not the legacy backend.",
    icon: Cloud,
  },
  {
    title: "Starter workspace",
    description:
      "Use this screen as the jump-off point for rebuilding members, classes, billing, and analytics.",
    icon: LayoutDashboard,
  },
]

const rebuildTracks = [
  "Define the new product data model before copying UI flows.",
  "Recreate only the backend responsibilities that still make sense in the new app.",
  "Use the old app for product reference, not for route or state architecture.",
]

export default async function DashboardPage() {
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

  const projectHost = getSupabaseProjectHost()

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-16 md:px-10">
      <header className="flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-card/70 p-8 backdrop-blur-xl lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Sparkles className="size-4" />
            New workspace foundation
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Welcome back{user.email ? `, ${user.email}` : ""}.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              Start rebuilding the Box Fitness product on clean infrastructure
              and only reintroduce the workflows you still want to own.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="rounded-full border border-white/10 bg-black/20 px-4 py-3 text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d")}
          </div>
          <form action={signOutAction}>
            <Button type="submit" variant="outline" className="rounded-full">
              <LogOut className="size-4" />
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {summaryCards.map(({ title, description, icon: Icon }) => (
          <Card key={title} className="border-white/10 bg-card/70 backdrop-blur-xl">
            <CardHeader className="space-y-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription className="leading-7">{description}</CardDescription>
              </div>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-white/10 bg-card/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Connected foundation</CardTitle>
            <CardDescription className="leading-7">
              The app is already aligned around the new cloud environment.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary/80">
                Supabase host
              </p>
              <p className="mt-3 text-base text-foreground">
                {projectHost ?? "Not configured"}
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary/80">
                Next.js pattern
              </p>
              <p className="mt-3 text-base text-foreground">
                Proxy refresh + server components + server actions
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Recommended rebuild order</CardTitle>
            <CardDescription className="leading-7">
              Keep the scope tight and rebuild capabilities in the order that
              reduces backend ambiguity first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {rebuildTracks.map((track, index) => (
              <div
                key={track}
                className="flex gap-4 rounded-3xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-sm text-primary">
                  0{index + 1}
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{track}</p>
              </div>
            ))}

            <div className="flex items-start gap-3 rounded-3xl border border-primary/20 bg-primary/10 p-5 text-sm leading-7 text-primary">
              <RefreshCw className="mt-0.5 size-4 shrink-0" />
              Reference the old dashboard for product behavior, but avoid
              pulling over its data-fetching and state structure by default.
            </div>

            <div className="flex items-start gap-3 rounded-3xl border border-white/10 bg-black/20 p-5 text-sm leading-7 text-muted-foreground">
              <Database className="mt-0.5 size-4 shrink-0 text-primary" />
              Once the new schema stabilizes, you can decide which former edge
              functions deserve first-class backend ownership here.
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}
