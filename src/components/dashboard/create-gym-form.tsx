"use client"

import { useActionState, useState } from "react"
import { CircleAlert, ShieldCheck, Sparkles } from "lucide-react"

import {
  createGymAction,
  initialCreateGymActionState,
} from "@/app/dashboard/actions"
import { SubmitButton } from "@/components/auth/submit-button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const FALLBACK_GYM_NAME = "Box Fitness Downtown"
const FALLBACK_SLUG = "box-fitness-downtown"

function slugifyGymName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

export function CreateGymForm() {
  const [state, formAction] = useActionState(
    createGymAction,
    initialCreateGymActionState
  )
  const [gymName, setGymName] = useState("")

  const previewName = gymName.trim() || FALLBACK_GYM_NAME
  const generatedSlug = slugifyGymName(gymName)
  const previewSlug = generatedSlug || FALLBACK_SLUG

  return (
    <Card className="border-border/70 bg-white/84">
      <CardHeader className="space-y-3">
        <CardTitle className="text-[1.75rem]">Create a new gym</CardTitle>
        <CardDescription className="max-w-xl leading-7">
          Start with the gym name. The URL slug is generated automatically so the
          workspace can be selected immediately after creation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="gym-name">Gym name</Label>
            <Input
              id="gym-name"
              aria-invalid={Boolean(state.fieldErrors?.name)}
              name="name"
              onChange={(event) => setGymName(event.target.value)}
              placeholder="Box Fitness Downtown"
              required
              value={gymName}
            />
            {state.fieldErrors?.name ? (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Example slug: `{previewSlug}`
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="app-subpanel p-4">
              <p className="section-label">Workspace</p>
              <p className="mt-3 text-sm font-semibold text-foreground">{previewName}</p>
              <p className="mt-1 text-sm text-muted-foreground">Primary location shell</p>
            </div>
            <div className="app-subpanel p-4">
              <p className="section-label">Generated Slug</p>
              <p className="mt-3 text-sm font-semibold text-foreground">/{previewSlug}</p>
              <p className="mt-1 text-sm text-muted-foreground">Used in the dashboard switcher</p>
            </div>
            <div className="app-subpanel p-4">
              <p className="section-label">Access</p>
              <p className="mt-3 text-sm font-semibold text-foreground">Owner role assigned</p>
              <p className="mt-1 text-sm text-muted-foreground">You become the first member</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="app-subpanel flex items-start gap-3 p-4">
              <Sparkles className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Clean starting point</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Members, classes, billing, and analytics can be rebuilt on top of this
                  workspace without carrying legacy route debt.
                </p>
              </div>
            </div>
            <div className="app-subpanel flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Protected immediately</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The new workspace appears inside the authenticated shell as soon as the
                  action succeeds.
                </p>
              </div>
            </div>
          </div>

          {state.message ? (
            <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{state.message}</span>
            </div>
          ) : null}

          <SubmitButton pendingLabel="Creating gym...">Create gym</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}
