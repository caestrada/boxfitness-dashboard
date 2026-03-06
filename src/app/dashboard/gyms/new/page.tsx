import Link from "next/link"
import { ArrowLeft, Building2, ShieldCheck, Sparkles } from "lucide-react"

import { CreateGymForm } from "@/components/dashboard/create-gym-form"
import { Button } from "@/components/ui/button"

const workspacePreviewRows = [
  {
    label: "Route anchor",
    value: "/dashboard?gym=box-fitness-downtown",
  },
  {
    label: "Initial access",
    value: "Owner membership assigned",
  },
  {
    label: "Modules enabled next",
    value: "Members, classes, billing, analytics",
  },
] as const

const guardrails = [
  "This creates the gym shell only, not a full legacy migration.",
  "The new location appears in the switcher immediately after the server action succeeds.",
  "Every future feature module can attach to the right organization boundary from day one.",
] as const

export default function CreateGymPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <div className="flex items-center">
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="app-panel relative overflow-hidden p-8 md:p-10">
            <div
              aria-hidden="true"
              className="absolute -right-10 top-2 h-36 w-36 rounded-full bg-primary/12 blur-3xl"
            />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                <Building2 className="size-4" />
                New gym workspace
              </div>

              <div className="mt-6 space-y-4">
                <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance md:text-5xl">
                  Add the next Box Fitness location.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                  Creating a gym establishes the organization boundary first. Members,
                  classes, billing, and analytics can then be rebuilt on top of that
                  workspace intentionally.
                </p>
              </div>
            </div>
          </section>

          <CreateGymForm />
        </div>

        <section className="app-panel relative overflow-hidden">
          <div
            aria-hidden="true"
            className="dot-grid absolute inset-0 opacity-45 [mask-image:radial-gradient(circle_at_center,white,transparent_80%)]"
          />

          <div className="surface-strong relative m-5 rounded-[1.75rem] p-6">
            <p className="section-label">Workspace Preview</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-balance">
              New location packet
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This is the first layer the system creates when a new gym is added to the
              Box Fitness control plane.
            </p>

            <div className="mt-6 space-y-3">
              {workspacePreviewRows.map(({ label, value }) => (
                <div
                  key={label}
                  className="surface-soft flex items-start justify-between gap-4 rounded-[1.2rem] px-4 py-3"
                >
                  <p className="text-sm text-muted-foreground">{label}</p>
                  <p className="max-w-[14rem] text-right text-sm font-medium text-foreground">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="app-subpanel flex gap-3 p-4">
                <Sparkles className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Cleaner rollout</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Create the gym shell first and let the workflow list grow from real
                    product decisions.
                  </p>
                </div>
              </div>

              <div className="app-subpanel flex gap-3 p-4">
                <ShieldCheck className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Protected start</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    The new workspace appears inside the authenticated shell, not in mock
                    client-only state.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="relative border-t border-border/70 px-5 pb-5 pt-4">
            <p className="section-label">Guardrails</p>
            <div className="mt-4 space-y-3">
              {guardrails.map((item, index) => (
                <div key={item} className="app-subpanel flex gap-4 p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm text-primary">
                    0{index + 1}
                  </div>
                  <p className="text-sm leading-7 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>
    </div>
  )
}
