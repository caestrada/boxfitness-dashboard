import Link from "next/link"
import { ArrowLeft, Building2, Sparkles } from "lucide-react"

import { CreateGymForm } from "@/components/dashboard/create-gym-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function CreateGymPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <div className="flex items-center">
        <Button asChild className="rounded-full" variant="ghost">
          <Link href="/dashboard">
            <ArrowLeft className="size-4" />
            Back to dashboard
          </Link>
        </Button>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-white/10 bg-card/75 p-8 shadow-xl backdrop-blur-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Building2 className="size-4" />
              New gym workspace
            </div>

            <div className="mt-6 space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-balance">
                Add the next Box Fitness location.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground">
                Creating a gym adds a new organization workspace and makes you the
                initial owner. From there you can layer in members, classes,
                billing, and analytics intentionally.
              </p>
            </div>
          </div>

          <CreateGymForm />
        </div>

        <Card className="border-white/10 bg-card/75 backdrop-blur-xl">
          <CardHeader className="space-y-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl">What happens next</CardTitle>
              <CardDescription className="leading-7">
                This creates the gym shell only. It does not assume legacy workflows
                should come back unchanged.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">
                01
              </p>
              <p className="mt-3">
                The gym appears in the sidebar header dropdown immediately after the
                action completes.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">
                02
              </p>
              <p className="mt-3">
                You land back on the dashboard with that gym selected as the active
                workspace.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">
                03
              </p>
              <p className="mt-3">
                The rebuild stays organization-aware from the start, so future
                modules can attach to the right gym boundary cleanly.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
