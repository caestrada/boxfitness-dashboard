"use server"

import { redirect } from "next/navigation"
import { z } from "zod/v3"

import type { CreateMemberActionState } from "@/app/dashboard/members/member-action-state"
import { hasSupabaseEnv, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env"
import {
  createAdminClient,
  hasSupabaseAdminEnv,
  MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE,
} from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const createMemberSchema = z.object({
  organizationId: z.string().uuid("Choose a valid gym workspace."),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(160, "Full name must be 160 characters or fewer."),
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .or(z.literal(""))
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone must be 30 characters or fewer.")
    .optional(),
  status: z.enum(["lead", "active", "frozen", "inactive"]),
  membershipPlan: z
    .string()
    .trim()
    .max(120, "Membership plan must be 120 characters or fewer.")
    .optional(),
  joinedAt: z
    .string()
    .trim()
    .min(1, "Choose a join date.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Choose a valid join date."),
  outstandingBalance: z
    .string()
    .trim()
    .refine((value) => /^(\d+)(\.\d{1,2})?$/.test(value), "Enter a valid amount like 0 or 49.99."),
})

function dollarsToCents(value: string) {
  return Math.round(Number(value) * 100)
}

function shouldFallbackToDirectInsert(message: string) {
  const normalizedMessage = message.toLowerCase()

  return (
    normalizedMessage.includes("create_member_with_membership") &&
    normalizedMessage.includes("schema cache")
  )
}

function getMembersSetupErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes("public.members") ||
    normalizedMessage.includes("public.member_organizations") ||
    normalizedMessage.includes("create_member_with_membership")
  ) {
    return "This Supabase project is missing the latest members schema. Apply the migrations in `supabase/migrations/`, especially `20260312130000_add_members_directory.sql` and `20260312170000_create_member_with_membership_rpc.sql`, then try again."
  }

  return message
}

async function createMemberDirectly(options: {
  email: string | null
  fullName: string
  joinedAt: string
  membershipPlan: string | null
  organizationId: string
  outstandingBalanceCents: number
  phone: string | null
  status: "lead" | "active" | "frozen" | "inactive"
}) {
  const adminClient = createAdminClient()
  const { data: createdMember, error: memberError } = await adminClient
    .from("members")
    .insert({
      email: options.email,
      full_name: options.fullName,
      phone: options.phone,
    })
    .select("id")
    .single()

  if (memberError || !createdMember) {
    throw new Error(memberError?.message ?? "The member record could not be created.")
  }

  const { error: memberOrganizationError } = await adminClient
    .from("member_organizations")
    .insert({
      joined_at: options.joinedAt,
      member_id: createdMember.id,
      membership_plan: options.membershipPlan,
      organization_id: options.organizationId,
      outstanding_balance_cents: options.outstandingBalanceCents,
      status: options.status,
    })

  if (!memberOrganizationError) {
    return
  }

  await adminClient.from("members").delete().eq("id", createdMember.id)
  throw new Error(memberOrganizationError.message)
}

export async function createMemberAction(
  _previousState: CreateMemberActionState,
  formData: FormData
): Promise<CreateMemberActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: MISSING_SUPABASE_ENV_MESSAGE,
    }
  }

  const parsedValue = createMemberSchema.safeParse({
    organizationId:
      typeof formData.get("organizationId") === "string"
        ? formData.get("organizationId")
        : "",
    fullName:
      typeof formData.get("fullName") === "string" ? formData.get("fullName") : "",
    email: typeof formData.get("email") === "string" ? formData.get("email") : "",
    phone: typeof formData.get("phone") === "string" ? formData.get("phone") : "",
    status: typeof formData.get("status") === "string" ? formData.get("status") : "active",
    membershipPlan:
      typeof formData.get("membershipPlan") === "string"
        ? formData.get("membershipPlan")
        : "",
    joinedAt:
      typeof formData.get("joinedAt") === "string" ? formData.get("joinedAt") : "",
    outstandingBalance:
      typeof formData.get("outstandingBalance") === "string"
        ? formData.get("outstandingBalance")
        : "0",
  })

  if (!parsedValue.success) {
    const fieldErrors = parsedValue.error.flatten().fieldErrors

    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: {
        organizationId: fieldErrors.organizationId?.[0],
        fullName: fieldErrors.fullName?.[0],
        email: fieldErrors.email?.[0],
        phone: fieldErrors.phone?.[0],
        status: fieldErrors.status?.[0],
        membershipPlan: fieldErrors.membershipPlan?.[0],
        joinedAt: fieldErrors.joinedAt?.[0],
        outstandingBalance: fieldErrors.outstandingBalance?.[0],
      },
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/members/new")
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", parsedValue.data.organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle()

  if (membershipError) {
    return {
      status: "error",
      message: getMembersSetupErrorMessage(membershipError.message),
    }
  }

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return {
      status: "error",
      message: "Only gym owners or admins can add members.",
    }
  }

  const createMemberInput = {
    email: parsedValue.data.email || null,
    fullName: parsedValue.data.fullName,
    joinedAt: parsedValue.data.joinedAt,
    membershipPlan: parsedValue.data.membershipPlan || null,
    organizationId: parsedValue.data.organizationId,
    outstandingBalanceCents: dollarsToCents(parsedValue.data.outstandingBalance),
    phone: parsedValue.data.phone || null,
    status: parsedValue.data.status,
  } as const

  const { error } = await supabase.rpc("create_member_with_membership", {
    organization_id_input: parsedValue.data.organizationId,
    full_name_input: parsedValue.data.fullName,
    email_input: parsedValue.data.email || null,
    phone_input: parsedValue.data.phone || null,
    status_input: parsedValue.data.status,
    membership_plan_input: parsedValue.data.membershipPlan || null,
    joined_at_input: parsedValue.data.joinedAt,
    outstanding_balance_cents_input: createMemberInput.outstandingBalanceCents,
  })

  if (error && shouldFallbackToDirectInsert(error.message)) {
    if (!hasSupabaseAdminEnv()) {
      return {
        status: "error",
        message: `The member creation RPC is not available in the connected Supabase project yet. ${getMembersSetupErrorMessage(error.message)} ${MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE}`,
      }
    }

    try {
      await createMemberDirectly(createMemberInput)
    } catch (fallbackError) {
      return {
        status: "error",
        message:
          fallbackError instanceof Error
            ? getMembersSetupErrorMessage(fallbackError.message)
            : "The member could not be created.",
      }
    }
  } else if (error) {
    return {
      status: "error",
      message: getMembersSetupErrorMessage(error.message),
    }
  }

  redirect("/dashboard/members")
}
