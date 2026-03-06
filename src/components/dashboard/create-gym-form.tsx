"use client"

import { useActionState } from "react"
import { CircleAlert } from "lucide-react"

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

export function CreateGymForm() {
  const [state, formAction] = useActionState(
    createGymAction,
    initialCreateGymActionState
  )

  return (
    <Card className="border-white/10 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl">Create a new gym</CardTitle>
        <CardDescription className="leading-7">
          Start with the gym name. The URL slug is generated automatically from it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="gym-name">Gym name</Label>
            <Input
              id="gym-name"
              aria-invalid={Boolean(state.fieldErrors?.name)}
              name="name"
              placeholder="Box Fitness Downtown"
              required
            />
            {state.fieldErrors?.name ? (
              <p className="text-sm text-destructive">{state.fieldErrors.name}</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Example slug: `box-fitness-downtown`
              </p>
            )}
          </div>

          {state.message ? (
            <div className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-6 text-red-100">
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
