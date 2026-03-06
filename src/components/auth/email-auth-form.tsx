"use client"

import { useActionState } from "react"
import { CheckCircle2, CircleAlert } from "lucide-react"

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
import {
  initialAuthActionState,
  type AuthActionState,
} from "@/lib/auth/form-state"

interface EmailAuthFormProps {
  title: string
  description: string
  submitLabel: string
  pendingLabel: string
  redirectTo: string
  action: (
    state: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>
}

export function EmailAuthForm({
  title,
  description,
  submitLabel,
  pendingLabel,
  redirectTo,
  action,
}: EmailAuthFormProps) {
  const [state, formAction] = useActionState(action, initialAuthActionState)

  return (
    <Card className="border-border/70 bg-white/84">
      <CardHeader className="space-y-3">
        <CardTitle className="text-[1.75rem]">{title}</CardTitle>
        <CardDescription className="max-w-lg leading-7">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          <input type="hidden" name="redirectTo" value={redirectTo} />

          <div className="space-y-2">
            <Label htmlFor={`${title}-email`}>Email</Label>
            <Input
              id={`${title}-email`}
              autoComplete="email"
              aria-invalid={Boolean(state.fieldErrors?.email)}
              name="email"
              placeholder="owner@yourgym.com"
              required
              type="email"
            />
            {state.fieldErrors?.email ? (
              <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`${title}-password`}>Password</Label>
            <Input
              id={`${title}-password`}
              autoComplete={
                submitLabel === "Create account" ? "new-password" : "current-password"
              }
              aria-invalid={Boolean(state.fieldErrors?.password)}
              minLength={8}
              name="password"
              placeholder="At least 8 characters"
              required
              type="password"
            />
            {state.fieldErrors?.password ? (
              <p className="text-sm text-destructive">
                {state.fieldErrors.password}
              </p>
            ) : null}
          </div>

          {state.message ? (
            <div
              className={`flex gap-3 rounded-2xl border px-4 py-3 text-sm leading-6 ${
                state.status === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-destructive/20 bg-destructive/5 text-destructive"
              }`}
            >
              {state.status === "success" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CircleAlert className="mt-0.5 size-4 shrink-0" />
              )}
              <span>{state.message}</span>
            </div>
          ) : null}

          <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}
