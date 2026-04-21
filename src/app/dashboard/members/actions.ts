"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v3";

import type { MemberActionState } from "@/app/dashboard/members/member-action-state";
import { hasSupabaseEnv, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env";
import {
  createAdminClient,
  hasSupabaseAdminEnv,
  MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE,
} from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const memberFormSchema = z.object({
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
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      "Choose a valid join date.",
    ),
  outstandingBalance: z
    .string()
    .trim()
    .refine(
      (value) => /^(\d+)(\.\d{1,2})?$/.test(value),
      "Enter a valid amount like 0 or 49.99.",
    ),
});

const createMemberSchema = memberFormSchema.extend({
  organizationId: z.string().uuid("Choose a valid gym workspace."),
});

const updateMemberSchema = memberFormSchema.extend({
  memberId: z.string().uuid("Choose a valid member."),
  membershipId: z.string().uuid("Choose a valid membership."),
  organizationId: z.string().uuid("Choose a valid gym workspace."),
});

const deleteMemberSchema = z.object({
  memberId: z.string().uuid("Choose a valid member."),
  membershipId: z.string().uuid("Choose a valid membership."),
  organizationId: z.string().uuid("Choose a valid gym workspace."),
});

type MemberFormValues = z.infer<typeof memberFormSchema>;

function dollarsToCents(value: string) {
  return Math.round(Number(value) * 100);
}

function getStringFormValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value : fallback;
}

function shouldFallbackToDirectInsert(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    normalizedMessage.includes("create_member_with_membership") &&
    normalizedMessage.includes("schema cache")
  );
}

function getMembersSetupErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("public.members") ||
    normalizedMessage.includes("public.member_organizations") ||
    normalizedMessage.includes("create_member_with_membership")
  ) {
    return "This Supabase project is missing the latest members schema. Apply the migrations in `supabase/migrations/`, especially `20260312130000_add_members_directory.sql` and `20260312170000_create_member_with_membership_rpc.sql`, then try again.";
  }

  return message;
}

function parseMemberFormData(formData: FormData): MemberFormValues {
  return {
    fullName: getStringFormValue(formData, "fullName"),
    email: getStringFormValue(formData, "email"),
    phone: getStringFormValue(formData, "phone"),
    status: getStringFormValue(
      formData,
      "status",
      "active",
    ) as MemberFormValues["status"],
    membershipPlan: getStringFormValue(formData, "membershipPlan"),
    joinedAt: getStringFormValue(formData, "joinedAt"),
    outstandingBalance: getStringFormValue(formData, "outstandingBalance", "0"),
  };
}

function getFieldErrors(
  parsedError: z.ZodError<
    z.infer<typeof createMemberSchema> | z.infer<typeof updateMemberSchema>
  >,
) {
  const fieldErrors = parsedError.flatten().fieldErrors;

  return {
    organizationId: fieldErrors.organizationId?.[0],
    fullName: fieldErrors.fullName?.[0],
    email: fieldErrors.email?.[0],
    phone: fieldErrors.phone?.[0],
    status: fieldErrors.status?.[0],
    membershipPlan: fieldErrors.membershipPlan?.[0],
    joinedAt: fieldErrors.joinedAt?.[0],
    outstandingBalance: fieldErrors.outstandingBalance?.[0],
  };
}

async function requireMemberManagementAccess(
  organizationId: string,
  redirectPath: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth?redirectTo=${redirectPath}`);
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    return {
      ok: false as const,
      state: {
        status: "error" as const,
        message: getMembersSetupErrorMessage(membershipError.message),
      },
    };
  }

  if (
    !membership ||
    (membership.role !== "owner" && membership.role !== "admin")
  ) {
    return {
      ok: false as const,
      state: {
        status: "error" as const,
        message: "Only gym owners or admins can manage members.",
      },
    };
  }

  return {
    ok: true as const,
  };
}

async function createMemberDirectly(options: {
  email: string | null;
  fullName: string;
  joinedAt: string;
  membershipPlan: string | null;
  organizationId: string;
  outstandingBalanceCents: number;
  phone: string | null;
  status: "lead" | "active" | "frozen" | "inactive";
}) {
  const adminClient = createAdminClient();
  const { data: createdMember, error: memberError } = await adminClient
    .from("members")
    .insert({
      email: options.email,
      full_name: options.fullName,
      phone: options.phone,
    })
    .select("id")
    .single();

  if (memberError || !createdMember) {
    throw new Error(
      memberError?.message ?? "The member record could not be created.",
    );
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
    });

  if (!memberOrganizationError) {
    return;
  }

  await adminClient.from("members").delete().eq("id", createdMember.id);
  throw new Error(memberOrganizationError.message);
}

async function updateMemberDirectly(options: {
  email: string | null;
  fullName: string;
  joinedAt: string;
  memberId: string;
  membershipId: string;
  membershipPlan: string | null;
  organizationId: string;
  outstandingBalanceCents: number;
  phone: string | null;
  status: "lead" | "active" | "frozen" | "inactive";
}) {
  const adminClient = createAdminClient();
  const { data: existingMember, error: existingMemberError } = await adminClient
    .from("members")
    .select("full_name, email, phone")
    .eq("id", options.memberId)
    .maybeSingle();

  if (existingMemberError || !existingMember) {
    throw new Error(
      existingMemberError?.message ?? "The member record could not be found.",
    );
  }

  const { error: memberError } = await adminClient
    .from("members")
    .update({
      email: options.email,
      full_name: options.fullName,
      phone: options.phone,
    })
    .eq("id", options.memberId);

  if (memberError) {
    throw new Error(memberError.message);
  }

  const { error: membershipError } = await adminClient
    .from("member_organizations")
    .update({
      joined_at: options.joinedAt,
      membership_plan: options.membershipPlan,
      outstanding_balance_cents: options.outstandingBalanceCents,
      status: options.status,
    })
    .eq("id", options.membershipId)
    .eq("organization_id", options.organizationId);

  if (!membershipError) {
    return;
  }

  await adminClient
    .from("members")
    .update({
      email: existingMember.email,
      full_name: existingMember.full_name,
      phone: existingMember.phone,
    })
    .eq("id", options.memberId);

  throw new Error(membershipError.message);
}

async function deleteMemberDirectly(options: {
  memberId: string;
  membershipId: string;
  organizationId: string;
}) {
  const adminClient = createAdminClient();
  const { data: membershipRow, error: membershipLookupError } =
    await adminClient
      .from("member_organizations")
      .select("id")
      .eq("id", options.membershipId)
      .eq("member_id", options.memberId)
      .eq("organization_id", options.organizationId)
      .maybeSingle();

  if (membershipLookupError || !membershipRow) {
    throw new Error(
      membershipLookupError?.message ??
        "The member could not be found in this gym.",
    );
  }

  const { error: membershipDeleteError } = await adminClient
    .from("member_organizations")
    .delete()
    .eq("id", options.membershipId)
    .eq("member_id", options.memberId)
    .eq("organization_id", options.organizationId);

  if (membershipDeleteError) {
    throw new Error(membershipDeleteError.message);
  }

  const { count, error: remainingMembershipsError } = await adminClient
    .from("member_organizations")
    .select("id", { count: "exact", head: true })
    .eq("member_id", options.memberId);

  if (remainingMembershipsError) {
    throw new Error(remainingMembershipsError.message);
  }

  if ((count ?? 0) === 0) {
    const { error: memberDeleteError } = await adminClient
      .from("members")
      .delete()
      .eq("id", options.memberId);

    if (memberDeleteError) {
      throw new Error(memberDeleteError.message);
    }
  }
}

export async function createMemberAction(
  _previousState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: MISSING_SUPABASE_ENV_MESSAGE,
    };
  }

  const parsedValue = createMemberSchema.safeParse({
    ...parseMemberFormData(formData),
    organizationId:
      typeof formData.get("organizationId") === "string"
        ? formData.get("organizationId")
        : "",
  });

  if (!parsedValue.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsedValue.error),
    };
  }

  const accessResult = await requireMemberManagementAccess(
    parsedValue.data.organizationId,
    "/dashboard/members/new",
  );

  if (!accessResult.ok) {
    return accessResult.state;
  }

  const supabase = await createClient();
  const createMemberInput = {
    email: parsedValue.data.email || null,
    fullName: parsedValue.data.fullName,
    joinedAt: parsedValue.data.joinedAt,
    membershipPlan: parsedValue.data.membershipPlan || null,
    organizationId: parsedValue.data.organizationId,
    outstandingBalanceCents: dollarsToCents(
      parsedValue.data.outstandingBalance,
    ),
    phone: parsedValue.data.phone || null,
    status: parsedValue.data.status,
  } as const;

  const { error } = await supabase.rpc("create_member_with_membership", {
    organization_id_input: parsedValue.data.organizationId,
    full_name_input: parsedValue.data.fullName,
    email_input: parsedValue.data.email || null,
    phone_input: parsedValue.data.phone || null,
    status_input: parsedValue.data.status,
    membership_plan_input: parsedValue.data.membershipPlan || null,
    joined_at_input: parsedValue.data.joinedAt,
    outstanding_balance_cents_input: createMemberInput.outstandingBalanceCents,
  });

  if (error && shouldFallbackToDirectInsert(error.message)) {
    if (!hasSupabaseAdminEnv()) {
      return {
        status: "error",
        message: `The member creation RPC is not available in the connected Supabase project yet. ${getMembersSetupErrorMessage(error.message)} ${MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE}`,
      };
    }

    try {
      await createMemberDirectly(createMemberInput);
    } catch (fallbackError) {
      return {
        status: "error",
        message:
          fallbackError instanceof Error
            ? getMembersSetupErrorMessage(fallbackError.message)
            : "The member could not be created.",
      };
    }
  } else if (error) {
    return {
      status: "error",
      message: getMembersSetupErrorMessage(error.message),
    };
  }

  redirect("/dashboard/members");
}

export async function updateMemberAction(
  _previousState: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: MISSING_SUPABASE_ENV_MESSAGE,
    };
  }

  const parsedValue = updateMemberSchema.safeParse({
    ...parseMemberFormData(formData),
    memberId:
      typeof formData.get("memberId") === "string"
        ? formData.get("memberId")
        : "",
    membershipId:
      typeof formData.get("membershipId") === "string"
        ? formData.get("membershipId")
        : "",
    organizationId:
      typeof formData.get("organizationId") === "string"
        ? formData.get("organizationId")
        : "",
  });

  if (!parsedValue.success) {
    return {
      status: "error",
      message: "Fix the highlighted fields and try again.",
      fieldErrors: getFieldErrors(parsedValue.error),
    };
  }

  const accessResult = await requireMemberManagementAccess(
    parsedValue.data.organizationId,
    `/dashboard/members/${parsedValue.data.membershipId}/edit`,
  );

  if (!accessResult.ok) {
    return accessResult.state;
  }

  if (!hasSupabaseAdminEnv()) {
    return {
      status: "error",
      message: `Editing member details requires server-side admin access. ${MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE}`,
    };
  }

  try {
    await updateMemberDirectly({
      email: parsedValue.data.email || null,
      fullName: parsedValue.data.fullName,
      joinedAt: parsedValue.data.joinedAt,
      memberId: parsedValue.data.memberId,
      membershipId: parsedValue.data.membershipId,
      membershipPlan: parsedValue.data.membershipPlan || null,
      organizationId: parsedValue.data.organizationId,
      outstandingBalanceCents: dollarsToCents(
        parsedValue.data.outstandingBalance,
      ),
      phone: parsedValue.data.phone || null,
      status: parsedValue.data.status,
    });
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? getMembersSetupErrorMessage(error.message)
          : "The member could not be updated.",
    };
  }

  redirect(`/dashboard/members/${parsedValue.data.membershipId}`);
}

export async function deleteMemberAction(input: {
  memberId: string;
  membershipId: string;
  organizationId: string;
}) {
  if (!hasSupabaseEnv()) {
    return {
      status: "error" as const,
      message: MISSING_SUPABASE_ENV_MESSAGE,
    };
  }

  const parsedValue = deleteMemberSchema.safeParse(input);

  if (!parsedValue.success) {
    return {
      status: "error" as const,
      message: "The member delete request is invalid.",
    };
  }

  const accessResult = await requireMemberManagementAccess(
    parsedValue.data.organizationId,
    `/dashboard/members/${parsedValue.data.membershipId}`,
  );

  if (!accessResult.ok) {
    return accessResult.state;
  }

  if (!hasSupabaseAdminEnv()) {
    return {
      status: "error" as const,
      message: `Deleting members requires server-side admin access. ${MISSING_SUPABASE_SERVICE_ROLE_KEY_MESSAGE}`,
    };
  }

  try {
    await deleteMemberDirectly(parsedValue.data);
  } catch (error) {
    return {
      status: "error" as const,
      message:
        error instanceof Error
          ? getMembersSetupErrorMessage(error.message)
          : "The member could not be deleted.",
    };
  }

  revalidatePath("/dashboard/members");
  revalidatePath(`/dashboard/members/${parsedValue.data.membershipId}`);
  revalidatePath(`/dashboard/members/${parsedValue.data.membershipId}/edit`);

  return {
    status: "success" as const,
    message: "Member removed.",
  };
}
