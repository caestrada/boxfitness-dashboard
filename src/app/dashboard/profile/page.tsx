import { Moon, Settings2, Sun, UserRound } from "lucide-react"

import { ThemePreferenceCard } from "@/components/dashboard/theme-preference-card"

const profileNotes = [
  {
    title: "Theme preference",
    body: "Switch between light and dark mode without changing the underlying app structure.",
    icon: Settings2,
  },
  {
    title: "Local persistence",
    body: "Your choice is saved in this browser so the shell reopens in the same mode.",
    icon: UserRound,
  },
] as const

const modeRows = [
  {
    label: "Light mode",
    value: "Default working mode",
    icon: Sun,
  },
  {
    label: "Dark mode",
    value: "Optional lower-luminance mode",
    icon: Moon,
  },
] as const

export default function ProfilePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6">
      <section className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
        <section className="app-panel relative overflow-hidden p-8 md:p-10">
          <div
            aria-hidden="true"
            className="absolute -right-10 top-4 h-36 w-36 rounded-full bg-primary/12 blur-3xl"
          />

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <UserRound className="size-4" />
              Profile
            </div>

            <div className="mt-6 space-y-4">
              <h1 className="text-4xl font-semibold tracking-[-0.04em] text-balance md:text-5xl">
                Personalize how the Box Fitness shell looks.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-muted-foreground md:text-lg">
                This profile section starts with appearance controls so you can move
                between the lighter editorial shell and a darker operational mode when
                needed.
              </p>
            </div>

            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {profileNotes.map(({ title, body, icon: Icon }) => (
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
            </div>
          </div>
        </section>

        <section className="app-panel relative overflow-hidden">
          <div
            aria-hidden="true"
            className="dot-grid absolute inset-0 opacity-45 [mask-image:radial-gradient(circle_at_center,white,transparent_82%)]"
          />

          <div className="surface-strong relative m-5 rounded-[1.75rem] p-6">
            <p className="section-label">Available Modes</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-balance">
              Appearance options
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Both themes keep the same layout and data model. Only the presentation
              layer changes.
            </p>

            <div className="mt-6 space-y-3">
              {modeRows.map(({ label, value, icon: Icon }) => (
                <div
                  key={label}
                  className="surface-soft flex items-center justify-between gap-4 rounded-[1.2rem] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="size-4" />
                    </div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </section>

      <ThemePreferenceCard />
    </div>
  )
}
