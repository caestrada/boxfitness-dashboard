"use client";

import { Building2, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { updateDefaultGymAction } from "@/app/dashboard/actions";
import { initialDefaultGymActionState } from "@/app/dashboard/default-gym-action-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardGym } from "@/lib/dashboard";

interface DefaultGymCardProps {
  defaultOrganizationId: string | null;
  gyms: DashboardGym[];
}

function DefaultGymSaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} size="sm" type="submit" variant="outline">
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" />
          Saving...
        </>
      ) : (
        "Save default gym"
      )}
    </Button>
  );
}

export function DefaultGymCard({
  defaultOrganizationId,
  gyms,
}: DefaultGymCardProps) {
  const router = useRouter();
  const [defaultGymState, defaultGymFormAction] = useActionState(
    updateDefaultGymAction,
    initialDefaultGymActionState,
  );
  const defaultGymInputRef = useRef<HTMLInputElement>(null);
  const lastHandledSubmissionIdRef = useRef<string | null>(null);

  const resolvedDefaultOrganizationId =
    (defaultGymState.status === "success"
      ? (defaultGymState.defaultOrganizationId ?? null)
      : defaultOrganizationId) ??
    gyms[0]?.id ??
    null;

  useEffect(() => {
    if (!defaultGymState.message || !defaultGymState.submissionId) {
      return;
    }

    if (lastHandledSubmissionIdRef.current === defaultGymState.submissionId) {
      return;
    }

    lastHandledSubmissionIdRef.current = defaultGymState.submissionId;

    if (defaultGymState.status === "error") {
      toast.error(defaultGymState.message);
      return;
    }

    toast.success(defaultGymState.message);

    startTransition(() => {
      router.refresh();
    });
  }, [
    defaultGymState.message,
    defaultGymState.status,
    defaultGymState.submissionId,
    router,
  ]);

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Building2 className="size-5" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl">Default gym</CardTitle>
            <CardDescription className="max-w-2xl leading-7">
              Choose which gym workspace should load by default across members,
              billing, and the rest of the dashboard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {gyms.length > 0 ? (
          <form
            action={defaultGymFormAction}
            className="space-y-5"
            key={resolvedDefaultOrganizationId ?? "no-default-gym"}
          >
            <div className="space-y-2">
              <Label htmlFor="profile-default-gym">Default gym</Label>
              <input
                defaultValue={resolvedDefaultOrganizationId ?? ""}
                name="organizationId"
                ref={defaultGymInputRef}
                type="hidden"
              />
              <Select
                defaultValue={resolvedDefaultOrganizationId ?? ""}
                onValueChange={(value) => {
                  if (defaultGymInputRef.current) {
                    defaultGymInputRef.current.value = value;
                  }
                }}
              >
                <SelectTrigger
                  aria-invalid={Boolean(
                    defaultGymState.fieldErrors?.organizationId,
                  )}
                  className="h-11 w-full rounded-[1rem] bg-white/80 px-4 dark:bg-input/90"
                  id="profile-default-gym"
                >
                  <SelectValue placeholder="Select a default gym" />
                </SelectTrigger>
                <SelectContent>
                  {gyms.map((gym) => (
                    <SelectItem key={gym.id} value={gym.id}>
                      {gym.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {defaultGymState.fieldErrors?.organizationId ? (
                <p className="text-sm text-destructive">
                  {defaultGymState.fieldErrors.organizationId}
                </p>
              ) : gyms.length > 1 && !defaultOrganizationId ? (
                <p className="text-sm text-muted-foreground">
                  No default gym is saved yet. Choose one so members, billing,
                  and future modules stop relying on the fallback workspace.
                </p>
              ) : gyms.length > 1 ? (
                <p className="text-sm text-muted-foreground">
                  Changing the default gym refreshes the workspace across the
                  dashboard.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This is your only gym workspace, so it is also your default
                  gym.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {gyms.length > 1
                  ? "Save the workspace you want to open first."
                  : "Add more gyms later if you want to change the default workspace."}
              </p>
              <DefaultGymSaveButton />
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">
              Create your first gym workspace before setting a default.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
