import {
  Cloud,
  Database,
  Dumbbell,
  LayoutDashboard,
  type LucideIcon,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EmailAuthForm } from "@/components/auth/email-auth-form";
import { SetupPanel } from "@/components/setup/setup-panel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasSupabaseEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { getFirstString, normalizeRedirectPath } from "@/lib/url";

import { signInAction, signUpAction } from "./actions";

interface AuthPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

const authNotes: Array<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Protected app shell",
    body: "Dashboard routes stay server-protected while auth pages remain public and intentionally small.",
    icon: ShieldCheck,
  },
  {
    title: "Cloud session flow",
    body: "Supabase cookies are refreshed in the proxy layer and reused on the server for every request.",
    icon: Cloud,
  },
  {
    title: "Rebuild-ready structure",
    body: "This surface keeps auth stable while the rest of the product is redesigned around cleaner workflows.",
    icon: LayoutDashboard,
  },
];

export default async function AuthPage({ searchParams }: AuthPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const redirectTo = normalizeRedirectPath(
    getFirstString(resolvedSearchParams.redirectTo),
  );
  const message = getFirstString(resolvedSearchParams.message);

  if (hasSupabaseEnv()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      redirect(redirectTo);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div
        aria-hidden="true"
        className="absolute left-[5%] top-28 hidden w-64 rounded-[2rem] border border-border/70 bg-white/76 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.3)] dark:bg-card/92 dark:shadow-[0_28px_80px_-48px_rgba(0,0,0,0.72)] xl:block"
      >
        <p className="section-label">Session Boundary</p>
        <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
          SSR-protected routes stay intact.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The visual system is lighter, but the auth contract remains
          server-first.
        </p>
      </div>

      <div
        aria-hidden="true"
        className="absolute right-[6%] top-36 hidden w-72 rounded-[2rem] border border-border/70 bg-white/76 p-5 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.3)] dark:bg-card/92 dark:shadow-[0_28px_80px_-48px_rgba(0,0,0,0.72)] xl:block"
      >
        <p className="section-label">Cloud Target</p>
        <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">
          Fresh Supabase project, clean auth path.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This rebuild keeps the backend boundary new, even while product
          workflows are still being reselected.
        </p>
      </div>

      <Link
        href="/"
        className="absolute left-6 top-6 inline-flex items-center gap-3 rounded-full border border-border/70 bg-white/78 px-4 py-2 text-sm font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] dark:bg-card/90"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Dumbbell className="size-4" />
        </span>
        Box Fitness
      </Link>

      <div className="relative z-10 w-full max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
            <Database className="size-4" />
            Cloud auth foundation
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-balance md:text-6xl">
            Welcome back to the Box Fitness operating system.
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            A lighter shell, clearer hierarchy, and the same server-first auth
            boundary underneath.
          </p>
        </div>

        {message ? (
          <Card className="mx-auto mt-8 max-w-2xl border-primary/15 bg-primary/8 dark:bg-primary/10">
            <CardHeader>
              <CardDescription className="text-sm leading-7 text-primary">
                {message}
              </CardDescription>
            </CardHeader>
          </Card>
        ) : null}

        {!hasSupabaseEnv() ? (
          <div className="mx-auto mt-10 max-w-4xl">
            <SetupPanel />
          </div>
        ) : (
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <EmailAuthForm
              action={signInAction}
              description="Use your existing account to enter the protected dashboard and continue the rebuild from inside the authenticated shell."
              pendingLabel="Signing in..."
              redirectTo={redirectTo}
              submitLabel="Sign in"
              title="Sign in"
            />

            <div className="grid gap-5">
              <EmailAuthForm
                action={signUpAction}
                description="Create a new account. Email confirmation still routes through the Supabase callback flow."
                pendingLabel="Creating account..."
                redirectTo={redirectTo}
                submitLabel="Create account"
                title="Create account"
              />

              <Card className="border-border/70 bg-white/78 dark:bg-card/92">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    Why this surface changed
                  </CardTitle>
                  <CardDescription className="leading-7">
                    The new direction borrows a quieter, more editorial
                    interface style without relaxing the technical boundary
                    underneath.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {authNotes.map(({ title, body, icon: Icon }) => (
                    <div key={title} className="app-subpanel flex gap-4 p-4">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">
                          {title}
                        </p>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {body}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
