import { Cloud, KeyRound } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env"

const setupSteps = [
  "Create a new Supabase cloud project for the rebuild.",
  "Copy the project URL and publishable key into .env.local.",
  "Set the Site URL to http://localhost:3000 and add /auth/callback as a redirect URL.",
  "Apply the initial auth and organization migration from supabase/migrations.",
]

export function SetupPanel() {
  return (
    <Card className="border-primary/15 bg-white/82">
      <CardHeader className="space-y-5">
        <div className="flex size-14 items-center justify-center rounded-[1.6rem] bg-primary/12 text-primary">
          <Cloud className="size-6" />
        </div>
        <div className="space-y-3">
          <CardTitle className="text-3xl">
            Connect the new cloud Supabase project
          </CardTitle>
          <CardDescription className="max-w-2xl leading-7">
            {MISSING_SUPABASE_ENV_MESSAGE}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <ol className="space-y-3 text-sm leading-7 text-muted-foreground">
          {setupSteps.map((step, index) => (
            <li key={step} className="flex gap-3">
              <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/12 font-mono text-xs text-primary">
                0{index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <div className="rounded-[1.6rem] border border-border/70 bg-white/74 p-5 font-mono text-sm text-slate-600">
          <div className="mb-4 flex items-center gap-2 text-primary">
            <KeyRound className="size-4" />
            Required environment variables
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-all">
{`NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
