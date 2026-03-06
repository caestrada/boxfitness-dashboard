import { Cloud, Database, LayoutDashboard, ShieldCheck } from "lucide-react"
import { redirect } from "next/navigation"

import { EmailAuthForm } from "@/components/auth/email-auth-form"
import { SetupPanel } from "@/components/setup/setup-panel"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { hasSupabaseEnv } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"
import { getFirstString, normalizeRedirectPath } from "@/lib/url"

import { signInAction, signUpAction } from "./actions"

interface AuthPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

const authNotes = [
  {
    title: "Protected app shell",
    body: "Dashboard routes stay server-protected while auth pages remain public.",
    icon: ShieldCheck,
  },
  {
    title: "Cloud session flow",
    body: "Supabase cookies are refreshed in the proxy layer and reused on the server.",
    icon: Cloud,
  },
  {
    title: "Rebuild-ready structure",
    body: "This auth surface is intentionally small so the rest of the product can evolve cleanly around it.",
    icon: LayoutDashboard,
  },
]

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const redirectTo = normalizeRedirectPath(
    getFirstString(resolvedSearchParams.redirectTo)
  )
  const message = getFirstString(resolvedSearchParams.message)

  if (hasSupabaseEnv()) {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      redirect(redirectTo)
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16 md:px-10">
      <div className="grid w-full gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Database className="size-4" />
            Cloud Supabase auth foundation
          </div>

          <div className="space-y-4">
            <h1 className="max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">
              Sign in to the new Box Fitness control plane.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-muted-foreground">
              This is the first greenfield auth surface. Stable session handling
              comes first, then the workflows you decide to rebuild.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {authNotes.map(({ title, body, icon: Icon }) => (
              <Card
                key={title}
                className="border-white/10 bg-card/70 backdrop-blur-xl"
              >
                <CardHeader className="space-y-4">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-xl">{title}</CardTitle>
                    <CardDescription className="leading-7">{body}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          {message ? (
            <Card className="border-primary/20 bg-primary/10">
              <CardHeader>
                <CardDescription className="text-sm leading-7 text-primary">
                  {message}
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {!hasSupabaseEnv() ? (
            <SetupPanel />
          ) : (
            <div className="grid gap-5">
              <EmailAuthForm
                action={signInAction}
                description="Use an existing account to enter the protected dashboard."
                pendingLabel="Signing in..."
                redirectTo={redirectTo}
                submitLabel="Sign in"
                title="Welcome back"
              />
              <EmailAuthForm
                action={signUpAction}
                description="Create a new account. Email confirmation is handled through the Supabase callback route."
                pendingLabel="Creating account..."
                redirectTo={redirectTo}
                submitLabel="Create account"
                title="Start fresh"
              />
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
