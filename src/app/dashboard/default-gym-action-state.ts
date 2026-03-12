export interface DefaultGymActionFieldErrors {
  organizationId?: string
}

export interface DefaultGymActionState {
  status: "idle" | "success" | "error"
  message?: string
  fieldErrors?: DefaultGymActionFieldErrors
  defaultOrganizationId?: string | null
  submissionId?: string
}

export const initialDefaultGymActionState: DefaultGymActionState = {
  status: "idle",
}
