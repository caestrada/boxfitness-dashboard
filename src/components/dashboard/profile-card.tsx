"use client";

import { Camera, LoaderCircle, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  startTransition,
  useActionState,
  useEffect,
  useRef,
} from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import {
  updateProfileAvatarAction,
  updateProfileDetailsAction,
} from "@/app/dashboard/profile/actions";
import {
  initialProfileAvatarActionState,
  initialProfileDetailsActionState,
} from "@/app/dashboard/profile/profile-action-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type DashboardUserProfile,
  getInitials,
  getUserDisplayName,
} from "@/lib/dashboard";
import { PROFILE_AVATAR_ACCEPT } from "@/lib/profile-avatar";

interface ProfileCardProps {
  user: DashboardUserProfile;
}

function ProfileSaveButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending} size="sm" type="submit">
      {pending ? (
        <>
          <LoaderCircle className="size-4 animate-spin" />
          Saving...
        </>
      ) : (
        "Save profile"
      )}
    </Button>
  );
}

export function ProfileCard({ user }: ProfileCardProps) {
  const router = useRouter();
  const [avatarState, avatarFormAction] = useActionState(
    updateProfileAvatarAction,
    initialProfileAvatarActionState,
  );
  const [detailsState, detailsFormAction] = useActionState(
    updateProfileDetailsAction,
    initialProfileDetailsActionState,
  );
  const avatarFormRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastHandledAvatarSubmissionIdRef = useRef<string | null>(null);
  const lastHandledDetailsSubmissionIdRef = useRef<string | null>(null);

  const avatarUrl =
    avatarState.status === "success"
      ? (avatarState.avatarUrl ?? null)
      : user.avatarUrl;
  const currentFullName =
    detailsState.status === "success"
      ? (detailsState.fullName ?? null)
      : user.fullName;
  const displayName = getUserDisplayName({
    ...user,
    avatarUrl,
    fullName: currentFullName,
  });
  const initials = getInitials(displayName);

  useEffect(() => {
    if (!avatarState.message || !avatarState.submissionId) {
      return;
    }

    if (lastHandledAvatarSubmissionIdRef.current === avatarState.submissionId) {
      return;
    }

    lastHandledAvatarSubmissionIdRef.current = avatarState.submissionId;
    avatarFormRef.current?.reset();

    if (avatarState.status === "error") {
      toast.error(avatarState.message);
      return;
    }

    toast.success(avatarState.message);

    startTransition(() => {
      router.refresh();
    });
  }, [
    avatarState.message,
    avatarState.status,
    avatarState.submissionId,
    router,
  ]);

  useEffect(() => {
    if (!detailsState.message || !detailsState.submissionId) {
      return;
    }

    if (
      lastHandledDetailsSubmissionIdRef.current === detailsState.submissionId
    ) {
      return;
    }

    lastHandledDetailsSubmissionIdRef.current = detailsState.submissionId;

    if (detailsState.status === "error") {
      toast.error(detailsState.message);
      return;
    }

    toast.success(detailsState.message);

    startTransition(() => {
      router.refresh();
    });
  }, [
    detailsState.message,
    detailsState.status,
    detailsState.submissionId,
    router,
  ]);

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      return;
    }

    avatarFormRef.current?.requestSubmit();
  };

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="size-5" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl">Profile</CardTitle>
            <CardDescription className="max-w-2xl leading-7">
              Update the profile details that appear across your Box Fitness
              account.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-describedby="profile-avatar-help"
                  className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
                  type="button"
                >
                  <Avatar className="size-28 border border-primary/15 bg-primary/10 shadow-[0_0_0_1px_rgba(255,107,44,0.08)] transition-transform duration-200 group-hover:scale-[1.02]">
                    <AvatarImage
                      alt={displayName}
                      src={avatarUrl ?? undefined}
                    />
                    <AvatarFallback className="text-2xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <span className="absolute bottom-0 right-0 flex size-10 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-[0_16px_36px_-20px_rgba(255,107,44,0.55)]">
                    <Camera className="size-4" />
                  </span>
                  <span className="sr-only">Manage avatar</span>
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="start"
                className="w-56"
                sideOffset={16}
              >
                <DropdownMenuLabel>Avatar actions</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuItem onSelect={openFilePicker}>
                  <Camera className="size-4" />
                  {avatarUrl ? "Upload new photo" : "Upload photo"}
                </DropdownMenuItem>

                {avatarUrl ? (
                  <DropdownMenuItem asChild variant="destructive">
                    <button
                      className="flex w-full items-center gap-2"
                      form="profile-avatar-form"
                      name="intent"
                      type="submit"
                      value="remove"
                    >
                      <Trash2 className="size-4" />
                      Remove photo
                    </button>
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="min-w-0 space-y-4">
              <div className="min-w-0">
                <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  {displayName}
                </p>
                <p className="mt-1 text-base text-muted-foreground">
                  {user.email ?? "Signed in"}
                </p>
                <p
                  id="profile-avatar-help"
                  className="mt-2 text-sm text-muted-foreground"
                >
                  Click the photo to upload a new image or remove the current
                  one. Use a square image when possible so the crop stays clean
                  across the shell.
                </p>
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-5">
            <form action={detailsFormAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="profile-full-name">Full name</Label>
                <Input
                  key={currentFullName ?? "__empty__"}
                  defaultValue={currentFullName ?? ""}
                  id="profile-full-name"
                  aria-invalid={Boolean(detailsState.fieldErrors?.fullName)}
                  maxLength={120}
                  name="fullName"
                  placeholder="Carlos Estrada"
                />
                {detailsState.fieldErrors?.fullName ? (
                  <p className="text-sm text-destructive">
                    {detailsState.fieldErrors.fullName}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    This name is shown in the header menu and account surfaces.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  Save profile changes before leaving this page.
                </p>
                <ProfileSaveButton />
              </div>
            </form>

            <form
              id="profile-avatar-form"
              ref={avatarFormRef}
              action={avatarFormAction}
              className="w-full max-w-xl"
            >
              <input name="intent" type="hidden" value="upload" />
              <input
                ref={fileInputRef}
                accept={PROFILE_AVATAR_ACCEPT}
                aria-invalid={Boolean(avatarState.fieldErrors?.avatar)}
                aria-label="Avatar image"
                className="sr-only"
                name="avatar"
                onChange={handleAvatarChange}
                type="file"
              />
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
