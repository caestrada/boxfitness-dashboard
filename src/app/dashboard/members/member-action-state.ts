export interface CreateMemberActionFieldErrors {
  fullName?: string
  email?: string
  phone?: string
  status?: string
  membershipPlan?: string
  joinedAt?: string
  outstandingBalance?: string
  organizationId?: string
}

export interface CreateMemberActionState {
  status: "idle" | "error"
  message?: string
  fieldErrors?: CreateMemberActionFieldErrors
}

export const initialCreateMemberActionState: CreateMemberActionState = {
  status: "idle",
}
