import Link from "next/link"
import {
  ArrowRight,
  Cloud,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { getSupabaseProjectHost } from "@/lib/env"
import { parseDashboardGyms } from "@/lib/dashboard"
import { createClient } from "@/lib/supabase/server"

interface DashboardPageProps {
  searchParams?: Promise<{
    gym?: string | string[]
  }>
}

const operatingPrinciples: Array<{
  title: string
  body: string
  icon: LucideIcon
}> = [
  {
    title: "Protected by default",
    body: "Authenticated routes, SSR user resolution, and organization-aware reads stay in place while the interface becomes lighter and calmer.",
    icon: ShieldCheck,
  },
  {
    title: "Cloud-owned data model",
    body: "Every new module still points at a fresh Supabase cloud project instead of dragging the deprecated dashboard backend forward.",
    icon: Cloud,
  },
  {
    title: "Intentional rebuild",
    body: "Use this shell to decide which workflows deserve first-class ownership instead of copying every legacy screen over unchanged.",
    icon: Sparkles,
  },
]

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const requestedGymSlug =
    typeof resolvedSearchParams?.gym === "string" ? resolvedSearchParams.gym : null

  const supabase = await createClient()
  const { data: gymRows } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .is("archived_at", null)
    .order("name")

  const gyms = parseDashboardGyms(gymRows)
  const activeGym = gyms.find((gym) => gym.slug === requestedGymSlug) ?? gyms[0] ?? null
  const projectHost = getSupabaseProjectHost()

  const workspaceFacts = [
    {
      label: "Current workspace",
      value: activeGym?.name ?? "No gym selected",
      description: activeGym
        ? `Selected via /dashboard?gym=${activeGym.slug}`
        : "Create your first gym to activate the workspace switcher.",
    },
    {
      label: "Gym locations",
      value: `${gyms.length}`,
      description: gyms.length === 1 ? "1 gym connected" : `${gyms.length} gyms connected`,
    },
    {
      label: "Protected access",
      value: "SSR auth",
      description: "The shell stays server-protected while redesign work continues.",
    },
    {
      label: "Cloud target",
      value: projectHost ?? "Supabase pending",
      description: "Fresh cloud project, not the deprecated dashboard backend.",
    },
  ] as const

  const moduleRows = [
    {
      title: "Members + memberships",
      status: "Next slice",
    },
    {
      title: "Classes + schedule",
      status: "Queued",
    },
    {
      title: "Billing + reporting",
      status: "Queued",
    },
  ] as const

  const rebuildQueue = [
    "Model members and membership states per gym before lifting legacy screens over.",
    "Design class scheduling against the organization boundary instead of the old route map.",
    "Treat billing and analytics as separate modules so both can evolve against clean data contracts.",
  ] as const

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="app-panel relative overflow-hidden p-8 md:p-10">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white via-white/60 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute -right-10 top-2 h-36 w-36 rounded-full bg-primary/12 blur-3xl"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="size-4" />
              Gym-aware overview
            </div>

            <div className="mt-6 max-w-3xl space-y-4">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance md:text-6xl">
                {activeGym
                  ? `${activeGym.name} is the current Box Fitness workspace.`
                  : "Build the first Box Fitness workspace."}
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                {activeGym
                  ? "Use this lighter shell to rebuild the workflows that still deserve first-class ownership, starting from a clean organization boundary."
                  : "The new control plane is ready. Add a gym first, then let members, classes, billing, and analytics grow around that workspace instead of around legacy routes."}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/dashboard/gyms/new">
                  Create new gym
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth">Review auth surface</Link>
              </Button>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {workspaceFacts.map(({ label, value, description }) => (
                <div key={label} className="app-subpanel p-4">
                  <p className="section-label">{label}</p>
                  <p className="mt-3 text-lg font-semibold tracking-[-0.02em] text-foreground">
                    {value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="app-panel relative overflow-hidden">
          <div
            aria-hidden="true"
            className="dot-grid absolute inset-0 opacity-45 [mask-image:radial-gradient(circle_at_center,white,transparent_78%)]"
          />

          <div className="relative m-5 rounded-[1.75rem] border border-border/70 bg-white/88 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-label">Workspace Brief</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-balance">
                  {activeGym ? activeGym.name : "New Box Fitness location"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activeGym
                    ? `Active route anchor /dashboard?gym=${activeGym.slug}`
                    : "Your first gym becomes the anchor for every future feature route."}
                </p>
              </div>

              <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {activeGym ? "Live" : "Draft"}
              </span>
            </div>

            <div className="mt-6 space-y-3">
              {moduleRows.map(({ title, status }) => (
                <div
                  key={title}
                  className="flex items-center justify-between rounded-[1.2rem] border border-border/70 bg-white/82 px-4 py-3"
                >
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    {status}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-border/70 bg-secondary/55 p-5">
              <p className="section-label">Current Posture</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Data target</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {projectHost ?? "Supabase not configured"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Route context</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {activeGym ? `/dashboard?gym=${activeGym.slug}` : "/dashboard/gyms/new"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-border/70 bg-white/84">
          <CardHeader>
            <CardTitle className="text-2xl">Recommended next slices</CardTitle>
            <CardDescription className="leading-7">
              The shell is stable enough to start rebuilding the workflows that matter
              most, but still small enough to keep the boundary decisions disciplined.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {rebuildQueue.map((item, index) => (
              <div key={item} className="app-subpanel flex gap-4 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm text-primary">
                  0{index + 1}
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-white/84">
          <CardHeader>
            <CardTitle className="text-2xl">Operating principles</CardTitle>
            <CardDescription className="leading-7">
              The visual system changed, but the product direction did not: clean
              boundaries first, legacy copy-paste never by default.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {operatingPrinciples.map(({ title, body, icon: Icon }) => (
              <div key={title} className="app-subpanel flex gap-4 p-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
