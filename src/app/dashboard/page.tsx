import Link from "next/link"
import { ArrowRight, Building2, Cloud, ShieldCheck, Sparkles } from "lucide-react"

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

  const summaryCards = [
    {
      title: "Current workspace",
      value: activeGym?.name ?? "No gym selected",
      description: activeGym ? `/${activeGym.slug}` : "Create your first gym to activate the shell.",
      icon: Building2,
    },
    {
      title: "Gym locations",
      value: `${gyms.length}`,
      description: gyms.length === 1 ? "1 gym connected" : `${gyms.length} gyms connected`,
      icon: Sparkles,
    },
    {
      title: "Protected foundation",
      value: "SSR auth",
      description: "Authenticated layout, server actions, and organization-aware reads.",
      icon: ShieldCheck,
    },
    {
      title: "Cloud target",
      value: projectHost ?? "Supabase not configured",
      description: "Fresh cloud project, not the deprecated dashboard backend.",
      icon: Cloud,
    },
  ] as const

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <section className="rounded-[2rem] border border-white/10 bg-card/75 p-8 shadow-xl backdrop-blur-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <Sparkles className="size-4" />
          Dashboard foundation
        </div>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
              {activeGym ? `${activeGym.name} overview` : "Build the first gym workspace."}
            </h1>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground md:text-lg">
              {activeGym
                ? "Use the sidebar header to move between gyms, then rebuild the workflows that still deserve first-class ownership in the new app."
                : "The dashboard shell is ready. Add a gym to anchor members, classes, billing, and analytics around a clear organization boundary."}
            </p>
          </div>

          <Button asChild className="rounded-full px-6">
            <Link href="/dashboard/gyms/new">
              Create new gym
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {summaryCards.map(({ title, value, description, icon: Icon }) => (
          <Card key={title} className="border-white/10 bg-card/70 backdrop-blur-xl">
            <CardHeader className="space-y-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <Icon className="size-5" />
              </div>
              <div className="space-y-2">
                <CardDescription className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">
                  {title}
                </CardDescription>
                <CardTitle className="text-2xl leading-tight text-balance">{value}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Card className="border-white/10 bg-card/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Recommended next slices</CardTitle>
            <CardDescription className="leading-7">
              The shell is in place. Keep the rebuild focused on workflows that
              clarify the new backend model first.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Model member records and membership states per gym before lifting old screens over.",
              "Define the classes schedule flow around the new organization boundary instead of legacy route structure.",
              "Treat billing and analytics as separate modules so they can mature against clean data contracts.",
            ].map((item, index) => (
              <div
                key={item}
                className="flex gap-4 rounded-3xl border border-white/10 bg-black/20 p-5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-sm text-primary">
                  0{index + 1}
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{item}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-card/70 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-2xl">Why this shell matters</CardTitle>
            <CardDescription className="leading-7">
              The dashboard now matches the product direction: server-first auth,
              organization-aware navigation, and a cleaner boundary for future work.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              The sidebar header is driven by real organization data, so switching
              gyms does not need mock state.
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              The avatar menu keeps account actions in the page chrome instead of
              scattering them through individual screens.
            </div>
            <div className="rounded-3xl border border-primary/20 bg-primary/10 p-5 text-primary">
              Start building feature routes under this layout so every future module
              inherits the same gym context and authenticated shell.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
