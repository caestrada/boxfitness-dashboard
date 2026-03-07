"use client"

import { startTransition, useActionState, useEffect, useRef, type ChangeEvent } from "react"
import { Camera } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import {
  updateProfileAvatarAction,
} from "@/app/dashboard/profile/actions"
import { initialProfileAvatarActionState } from "@/app/dashboard/profile/avatar-action-state"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  getInitials,
  getUserDisplayName,
  type DashboardUserProfile,
} from "@/lib/dashboard"
import {
  PROFILE_AVATAR_ACCEPT,
} from "@/lib/profile-avatar"

interface ProfileAvatarCardProps {
  user: DashboardUserProfile
}

export function ProfileAvatarCard({ user }: ProfileAvatarCardProps) {
  const router = useRouter()
  const [state, formAction] = useActionState(
    updateProfileAvatarAction,
    initialProfileAvatarActionState
  )
  const formRef = useRef<HTMLFormElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const lastHandledSubmissionIdRef = useRef<string | null>(null)

  const displayName = getUserDisplayName(user)
  const initials = getInitials(displayName)
  const avatarUrl =
    state.status === "success" && "avatarUrl" in state ? state.avatarUrl ?? null : user.avatarUrl

  useEffect(() => {
    if (!state.message || !state.submissionId) {
      return
    }

    if (lastHandledSubmissionIdRef.current === state.submissionId) {
      return
    }

    lastHandledSubmissionIdRef.current = state.submissionId
    formRef.current?.reset()

    if (state.status === "error") {
      toast.error(state.message)
      return
    }

    toast.success(state.message)

    startTransition(() => {
      router.refresh()
    })
  }, [router, state.message, state.status, state.submissionId])

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files?.length) {
      return
    }

    formRef.current?.requestSubmit()
  }

  return (
    <Card className="border-border/70 bg-card">
      <CardHeader className="space-y-3">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Camera className="size-5" />
          </div>

          <div className="space-y-2">
            <CardTitle className="text-2xl">Avatar</CardTitle>
            <CardDescription className="max-w-2xl leading-7">
              Upload the image that appears in the dashboard header menu. Use a square
              image when possible so the crop stays clean across the shell.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
          <div className="flex justify-start">
            <button
              aria-describedby="profile-avatar-help"
              className="group relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              onClick={openFilePicker}
              type="button"
            >
              <Avatar className="size-28 border border-primary/15 bg-primary/10 shadow-[0_0_0_1px_rgba(255,107,44,0.08)] transition-transform duration-200 group-hover:scale-[1.02]">
                <AvatarImage alt={displayName} src={avatarUrl ?? undefined} />
                <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
              </Avatar>

              <span className="absolute bottom-0 right-0 flex size-10 items-center justify-center rounded-full border-4 border-card bg-primary text-primary-foreground shadow-[0_16px_36px_-20px_rgba(255,107,44,0.55)]">
                <Camera className="size-4" />
              </span>
              <span className="sr-only">Choose avatar image</span>
            </button>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="min-w-0">
              <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                {displayName}
              </p>
              <p className="mt-1 text-base text-muted-foreground">
                {user.email ?? "Signed in"}
              </p>
              <p id="profile-avatar-help" className="mt-2 text-sm text-muted-foreground">
                Click the photo to upload a new image.
              </p>
            </div>

            <form ref={formRef} action={formAction} className="w-full max-w-xl space-y-4">
              <input name="intent" type="hidden" value="upload" />
              <input
                ref={fileInputRef}
                accept={PROFILE_AVATAR_ACCEPT}
                aria-invalid={Boolean(state.fieldErrors?.avatar)}
                aria-label="Avatar image"
                className="sr-only"
                name="avatar"
                onChange={handleAvatarChange}
                type="file"
              />

              {avatarUrl ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button name="intent" type="submit" value="remove" variant="outline">
                    Remove avatar
                  </Button>
                </div>
              ) : null}
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
