import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ArrowRight,
  Cloud,
  Database,
  Dumbbell,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import { SetupPanel } from "@/components/setup/setup-panel"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { hasSupabaseEnv } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"

const foundationCards: Array<{
  title: string
  description: string
  icon: LucideIcon
}> = [
  {
    title: "Server-first auth",
    description:
      "Supabase SSR clients, protected routes, and clean session boundaries from day one.",
    icon: ShieldCheck,
  },
  {
    title: "Cloud-owned backend",
    description:
      "This app targets a fresh Supabase cloud project instead of carrying legacy backend debt forward.",
    icon: Cloud,
  },
  {
    title: "Rebuild with intent",
    description:
      "The old dashboard can inform feature decisions, but this app is free to use better boundaries everywhere.",
    icon: Database,
  },
]

const stackCards = [
  {
    eyebrow: "Next.js 16",
    title: "App Router and server actions",
    body: "Start with platform-native primitives for redirects, auth, and server-first flows.",
  },
  {
    eyebrow: "Supabase",
    title: "Cloud-first from the start",
    body: "Use a new cloud project now and only introduce local emulation later if it earns its keep.",
  },
  {
    eyebrow: "UI system",
    title: "Zinc tokens with a dark-first shell",
    body: "The starter already matches the design direction you specified for the rebuild.",
  },
]

export default async function Home() {
  if (hasSupabaseEnv()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      redirect("/dashboard")
    }
  }

  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,_hsl(18_100%_55%_/_0.32),_transparent_46%)]" />
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-14 px-6 py-16 md:px-10">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Dumbbell className="size-4" />
              Greenfield rebuild in progress
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-balance md:text-7xl">
                Box Fitness, rebuilt with cleaner boundaries.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground md:text-xl">
                This project starts fresh on Next.js 16 and a new cloud Supabase
                backend. The previous dashboard is reference material, not
                architecture to preserve.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link href="/auth">
                  Open auth foundation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                <Link href="/dashboard">
                  Explore starter dashboard
                  <LayoutDashboard className="size-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {foundationCards.map(({ title, description, icon: Icon }) => (
                <Card
                  key={title}
                  className="border-white/10 bg-white/5 backdrop-blur-sm"
                >
                  <CardHeader className="space-y-4">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-2">
                      <CardTitle className="text-xl">{title}</CardTitle>
                      <CardDescription className="leading-7">
                        {description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {stackCards.map(({ eyebrow, title, body }) => (
              <Card
                key={title}
                className="border-white/10 bg-card/75 backdrop-blur-xl"
              >
                <CardHeader>
                  <p className="font-mono text-xs uppercase tracking-[0.28em] text-primary/80">
                    {eyebrow}
                  </p>
                  <CardTitle className="text-2xl">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="leading-7 text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {!hasSupabaseEnv() ? (
          <SetupPanel />
        ) : (
          <Card className="border-white/10 bg-card/70 backdrop-blur-xl">
            <CardHeader>
              <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Sparkles className="size-5" />
              </div>
              <CardTitle className="text-3xl">
                The foundation is connected.
              </CardTitle>
              <CardDescription className="max-w-2xl leading-7">
                Supabase environment variables are present, so the app can use
                SSR auth flows, protected routes, and cloud-hosted data from the
                start.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>
    </main>
  )
}
