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
      "Supabase SSR clients, protected routes, and stable session boundaries from day one.",
    icon: ShieldCheck,
  },
  {
    title: "Cloud-owned backend",
    description:
      "This rebuild targets a fresh Supabase cloud project instead of preserving legacy backend debt.",
    icon: Cloud,
  },
  {
    title: "Intentional rebuild",
    description:
      "The old dashboard stays reference material only while the new app earns cleaner workflow boundaries.",
    icon: Database,
  },
]

const proofStrip = [
  "App Router foundation",
  "Gym-aware shell",
  "Cloud Supabase target",
  "Light-first redesign",
] as const

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
    <main className="relative overflow-hidden pb-16">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6 md:px-10">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-semibold">
          <span className="flex size-9 items-center justify-center rounded-full bg-foreground text-background">
            <Dumbbell className="size-4" />
          </span>
          Box Fitness
        </Link>

        <div className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <span>Foundation</span>
          <span>Workflow</span>
          <span>Cloud</span>
        </div>

        <div className="flex items-center gap-3">
          <Button asChild className="hidden sm:inline-flex" size="sm" variant="ghost">
            <Link href="/auth">Log in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/auth">
              Open app
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pb-8 pt-10 md:px-10 md:pt-14">
        <div className="app-frame relative overflow-hidden px-6 py-16 md:px-12 md:py-20">
          <div
            aria-hidden="true"
            className="absolute -left-10 top-20 hidden w-52 rotate-[-8deg] rounded-[2rem] border border-border/70 bg-white/84 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)] dark:bg-card/92 dark:shadow-[0_28px_80px_-48px_rgba(0,0,0,0.72)] lg:block"
          >
            <p className="section-label">Protected Shell</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Auth, routing, and workspace boundaries land first.
            </p>
          </div>

          <div
            aria-hidden="true"
            className="absolute -right-10 top-24 hidden w-56 rotate-[7deg] rounded-[2rem] border border-border/70 bg-white/84 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)] dark:bg-card/92 dark:shadow-[0_28px_80px_-48px_rgba(0,0,0,0.72)] lg:block"
          >
            <p className="section-label">Visual Direction</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
              Lighter, calmer, and more editorial than the old high-contrast shell.
            </p>
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              Light-first redesign in progress
            </div>

            <h1 className="mt-6 text-5xl font-semibold tracking-[-0.06em] text-balance md:text-7xl">
              Run Box Fitness from a calmer, clearer control plane.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              This rebuild keeps the server-first foundation, drops the heavier shell bias,
              and moves the product toward a quieter operational experience.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth">
                  Open auth foundation
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">
                  Explore dashboard shell
                  <LayoutDashboard className="size-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="mt-12 grid gap-3 md:grid-cols-4">
            {proofStrip.map((item) => (
              <div key={item} className="app-subpanel px-4 py-3 text-center text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 md:px-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-4">
          {foundationCards.map(({ title, description, icon: Icon }) => (
            <Card key={title} className="border-border/70 bg-white/84 dark:bg-card/92">
              <CardHeader className="space-y-4">
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{title}</CardTitle>
                  <CardDescription className="leading-7">{description}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="relative overflow-hidden border-border/70 bg-white/84 dark:bg-card/92">
          <div
            aria-hidden="true"
            className="dot-grid absolute inset-0 opacity-45 [mask-image:linear-gradient(180deg,white,transparent_85%)]"
          />

          <CardHeader className="relative">
            <p className="section-label">Current Foundation</p>
            <CardTitle className="text-3xl">A cleaner base for every workflow rebuild</CardTitle>
            <CardDescription className="max-w-2xl leading-7">
              The app already has the right platform pieces. The main work now is
              product translation: calmer layouts, clearer hierarchy, and better
              module boundaries.
            </CardDescription>
          </CardHeader>

          <CardContent className="relative grid gap-4 md:grid-cols-2">
            <div className="app-subpanel p-5">
              <p className="section-label">Ready Now</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <li>Protected routes and Supabase SSR auth</li>
                <li>Organization-aware dashboard shell</li>
                <li>Gym creation flow backed by cloud data</li>
              </ul>
            </div>

            <div className="app-subpanel p-5">
              <p className="section-label">Design Shift</p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                <li>Light-first palette with softer surfaces</li>
                <li>Large type, more whitespace, simpler chrome</li>
                <li>Document-style panels instead of glassy high-contrast cards</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto mt-6 max-w-6xl px-6 md:px-10">
        {!hasSupabaseEnv() ? (
          <SetupPanel />
        ) : (
          <Card className="border-border/70 bg-white/84 dark:bg-card/92">
            <CardHeader>
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </div>
              <CardTitle className="text-3xl">The foundation is connected.</CardTitle>
              <CardDescription className="max-w-2xl leading-7">
                Supabase environment variables are present, so the app can keep using
                SSR auth flows, protected routes, and cloud-hosted data while the new
                visual system rolls out.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </section>
    </main>
  )
}
