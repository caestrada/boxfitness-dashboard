export interface MemberActionFieldErrors {
  fullName?: string
  email?: string
  phone?: string
  status?: string
  membershipPlan?: string
  joinedAt?: string
  outstandingBalance?: string
  organizationId?: string
}

export interface MemberActionState {
  status: "idle" | "error"
  message?: string
  fieldErrors?: MemberActionFieldErrors
}

export const initialMemberActionState: MemberActionState = {
  status: "idle",
}

export type CreateMemberActionFieldErrors = MemberActionFieldErrors
export type CreateMemberActionState = MemberActionState
export const initialCreateMemberActionState = initialMemberActionState
