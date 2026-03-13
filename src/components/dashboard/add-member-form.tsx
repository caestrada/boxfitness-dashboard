"use client"

import { useActionState } from "react"
import { CircleAlert, Sparkles, UserPlus, Wallet } from "lucide-react"

import { createMemberAction } from "@/app/dashboard/members/actions"
import { initialCreateMemberActionState } from "@/app/dashboard/members/member-action-state"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AddMemberFormProps {
  organizationId: string
  organizationName: string
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10)
}

export function AddMemberForm({
  organizationId,
  organizationName,
}: AddMemberFormProps) {
  const [state, formAction] = useActionState(
    createMemberAction,
    initialCreateMemberActionState
  )

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="space-y-3">
        <CardTitle className="text-[1.75rem]">New member details</CardTitle>
        <CardDescription className="max-w-2xl leading-7">
          Create the member record and attach it directly to {organizationName}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input name="organizationId" type="hidden" value={organizationId} />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="member-full-name">Full name</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.fullName)}
                id="member-full-name"
                name="fullName"
                placeholder="Jordan Ramirez"
                required
              />
              {state.fieldErrors?.fullName ? (
                <p className="text-sm text-destructive">{state.fieldErrors.fullName}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This is the primary name shown across the members directory.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-email">Email</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.email)}
                id="member-email"
                name="email"
                placeholder="member@example.com"
                type="email"
              />
              {state.fieldErrors?.email ? (
                <p className="text-sm text-destructive">{state.fieldErrors.email}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-phone">Phone</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.phone)}
                id="member-phone"
                name="phone"
                placeholder="(555) 123-4567"
                type="tel"
              />
              {state.fieldErrors?.phone ? (
                <p className="text-sm text-destructive">{state.fieldErrors.phone}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-status">Status</Label>
              <Select defaultValue="active" name="status">
                <SelectTrigger
                  aria-invalid={Boolean(state.fieldErrors?.status)}
                  className="h-11 w-full rounded-[1rem] bg-white/80 px-4 dark:bg-input/90"
                  id="member-status"
                >
                  <SelectValue placeholder="Choose a status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="frozen">Frozen</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {state.fieldErrors?.status ? (
                <p className="text-sm text-destructive">{state.fieldErrors.status}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-plan">Membership plan</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.membershipPlan)}
                id="member-plan"
                name="membershipPlan"
                placeholder="Unlimited"
              />
              {state.fieldErrors?.membershipPlan ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.membershipPlan}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Leave blank if the plan has not been assigned yet.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-joined-at">Join date</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.joinedAt)}
                defaultValue={todayDateValue()}
                id="member-joined-at"
                name="joinedAt"
                type="date"
              />
              {state.fieldErrors?.joinedAt ? (
                <p className="text-sm text-destructive">{state.fieldErrors.joinedAt}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-outstanding-balance">Outstanding balance</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.outstandingBalance)}
                defaultValue="0"
                id="member-outstanding-balance"
                inputMode="decimal"
                name="outstandingBalance"
                placeholder="0.00"
              />
              {state.fieldErrors?.outstandingBalance ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.outstandingBalance}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Use dollars, for example `0`, `25`, or `49.99`.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="app-subpanel flex items-start gap-3 p-4">
              <UserPlus className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Person + membership</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  The form creates the person record and the gym membership link in one
                  step.
                </p>
              </div>
            </div>

            <div className="app-subpanel flex items-start gap-3 p-4">
              <Sparkles className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Gym scoped</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  This member is added directly to {organizationName}, not globally
                  across all gyms.
                </p>
              </div>
            </div>

            <div className="app-subpanel flex items-start gap-3 p-4">
              <Wallet className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="text-sm font-semibold text-foreground">Billing ready</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Outstanding balance starts in the membership record so finance views can
                  build on it later.
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

          <SubmitButton pendingLabel="Creating member...">Create member</SubmitButton>
        </form>
      </CardContent>
    </Card>
  )
}
