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

export interface ProfileDetailsActionFieldErrors {
  fullName?: string
}

export interface ProfileDetailsActionState {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: ProfileDetailsActionFieldErrors
  fullName?: string | null
  submissionId?: string
}

export const initialProfileDetailsActionState: ProfileDetailsActionState = {
  status: "idle",
}
