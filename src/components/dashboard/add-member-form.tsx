"use client";

import { CircleAlert } from "lucide-react";
import { useActionState } from "react";

import {
  createMemberAction,
  updateMemberAction,
} from "@/app/dashboard/members/actions";
import {
  initialMemberActionState,
  type MemberActionState,
} from "@/app/dashboard/members/member-action-state";
import { SubmitButton } from "@/components/auth/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const memberActionButtonClassName =
  "bg-primary text-primary-foreground shadow-[0_18px_36px_-24px_rgba(255,107,44,0.7)] hover:bg-primary/90";

export interface MemberFormValues {
  email: string;
  fullName: string;
  joinedAt: string;
  membershipPlan: string;
  outstandingBalance: string;
  phone: string;
  status: "lead" | "active" | "frozen" | "inactive";
}

interface BaseMemberFormProps {
  organizationId: string;
  submitLabel: string;
  pendingLabel: string;
  title: string;
  description: string;
  initialValues: MemberFormValues;
  hiddenFields?: Array<{
    name: string;
    value: string;
  }>;
  action: (
    state: MemberActionState,
    formData: FormData,
  ) => Promise<MemberActionState>;
}

interface AddMemberFormProps {
  organizationId: string;
  organizationName: string;
}

interface EditMemberFormProps {
  organizationId: string;
  organizationName: string;
  memberId: string;
  membershipId: string;
  initialValues: MemberFormValues;
}

function todayDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function MemberForm({
  action,
  description,
  hiddenFields,
  initialValues,
  organizationId,
  pendingLabel,
  submitLabel,
  title,
}: BaseMemberFormProps) {
  const [state, formAction] = useActionState(action, initialMemberActionState);

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="space-y-3">
        <CardTitle className="text-[1.75rem]">{title}</CardTitle>
        <CardDescription className="max-w-2xl leading-7">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input name="organizationId" type="hidden" value={organizationId} />
          {hiddenFields?.map((field) => (
            <input
              key={field.name}
              name={field.name}
              type="hidden"
              value={field.value}
            />
          ))}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="member-full-name">Full name</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.fullName)}
                defaultValue={initialValues.fullName}
                id="member-full-name"
                name="fullName"
                placeholder="Jordan Ramirez"
                required
              />
              {state.fieldErrors?.fullName ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.fullName}
                </p>
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
                defaultValue={initialValues.email}
                id="member-email"
                name="email"
                placeholder="member@example.com"
                type="email"
              />
              {state.fieldErrors?.email ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.email}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-phone">Phone</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.phone)}
                defaultValue={initialValues.phone}
                id="member-phone"
                name="phone"
                placeholder="(555) 123-4567"
                type="tel"
              />
              {state.fieldErrors?.phone ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.phone}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-status">Status</Label>
              <Select defaultValue={initialValues.status} name="status">
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
                <p className="text-sm text-destructive">
                  {state.fieldErrors.status}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-plan">Membership plan</Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.membershipPlan)}
                defaultValue={initialValues.membershipPlan}
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
                defaultValue={initialValues.joinedAt}
                id="member-joined-at"
                name="joinedAt"
                type="date"
              />
              {state.fieldErrors?.joinedAt ? (
                <p className="text-sm text-destructive">
                  {state.fieldErrors.joinedAt}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="member-outstanding-balance">
                Outstanding balance
              </Label>
              <Input
                aria-invalid={Boolean(state.fieldErrors?.outstandingBalance)}
                defaultValue={initialValues.outstandingBalance}
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

          {state.message ? (
            <div className="flex gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm leading-6 text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" />
              <span>{state.message}</span>
            </div>
          ) : null}

          <SubmitButton
            className={memberActionButtonClassName}
            pendingLabel={pendingLabel}
          >
            {submitLabel}
          </SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}

export function AddMemberForm({
  organizationId,
  organizationName,
}: AddMemberFormProps) {
  return (
    <MemberForm
      action={createMemberAction}
      description={`Create the member record and attach it directly to ${organizationName}.`}
      initialValues={{
        email: "",
        fullName: "",
        joinedAt: todayDateValue(),
        membershipPlan: "",
        outstandingBalance: "0",
        phone: "",
        status: "active",
      }}
      organizationId={organizationId}
      pendingLabel="Creating member..."
      submitLabel="Create member"
      title="New member details"
    />
  );
}

export function EditMemberForm({
  initialValues,
  memberId,
  membershipId,
  organizationId,
  organizationName,
}: EditMemberFormProps) {
  return (
    <MemberForm
      action={updateMemberAction}
      description={`Update this member record for ${organizationName}.`}
      hiddenFields={[
        { name: "memberId", value: memberId },
        { name: "membershipId", value: membershipId },
      ]}
      initialValues={initialValues}
      organizationId={organizationId}
      pendingLabel="Saving changes..."
      submitLabel="Save changes"
      title="Edit member details"
    />
  );
}
