export interface ProfileAvatarActionFieldErrors {
  avatar?: string
}

export interface ProfileAvatarActionState {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: ProfileAvatarActionFieldErrors
  avatarUrl?: string | null
  submissionId?: string
}

export const initialProfileAvatarActionState: ProfileAvatarActionState = {
  status: "idle",
}
