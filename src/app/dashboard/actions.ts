"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod/v3";
import type { DefaultGymActionState } from "@/app/dashboard/default-gym-action-state";
import type { CreateGymActionState } from "@/app/dashboard/gym-action-state";
import { hasSupabaseEnv, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const createGymSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Gym name must be at least 2 characters.")
    .max(120, "Gym name must be 120 characters or fewer."),
});

const updateDefaultGymSchema = z.object({
  organizationId: z.string().uuid("Choose a valid gym workspace."),
});

function slugifyGymName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function createDefaultGymSubmissionId() {
  return crypto.randomUUID();
}

function createDefaultGymErrorState(
  message: string,
  fieldErrors?: DefaultGymActionState["fieldErrors"],
): DefaultGymActionState {
  return {
    status: "error",
    message,
    fieldErrors,
    submissionId: createDefaultGymSubmissionId(),
  };
}

function createDefaultGymSuccessState(
  defaultOrganizationId: string,
): DefaultGymActionState {
  return {
    status: "success",
    message: "Default gym updated.",
    defaultOrganizationId,
    submissionId: createDefaultGymSubmissionId(),
  };
}

export async function createGymAction(
  _previousState: CreateGymActionState,
  formData: FormData,
): Promise<CreateGymActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: MISSING_SUPABASE_ENV_MESSAGE,
    };
  }

  const parsedValue = createGymSchema.safeParse({
    name: typeof formData.get("name") === "string" ? formData.get("name") : "",
  });

  if (!parsedValue.success) {
    return {
      status: "error",
      message: "Fix the highlighted field and try again.",
      fieldErrors: {
        name: parsedValue.error.issues[0]?.message,
      },
    };
  }

  const slug = slugifyGymName(parsedValue.data.name);

  if (!slug) {
    return {
      status: "error",
      message: "Gym name must include letters or numbers.",
      fieldErrors: {
        name: "Enter a gym name that can produce a valid URL slug.",
      },
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/gyms/new");
  }

  const { data: createdOrganizations, error: organizationError } =
    await supabase.rpc("create_organization_with_owner", {
      organization_name_input: parsedValue.data.name,
      organization_slug_input: slug,
    });

  if (organizationError) {
    if (organizationError.code === "23505") {
      return {
        status: "error",
        message: "That gym slug is already taken. Pick a more specific name.",
        fieldErrors: {
          name: "Try a more distinct gym name so the generated slug is unique.",
        },
      };
    }

    return {
      status: "error",
      message: organizationError.message,
    };
  }

  const organization = Array.isArray(createdOrganizations)
    ? createdOrganizations[0]
    : createdOrganizations;

  if (!organization?.slug) {
    return {
      status: "error",
      message:
        "The gym was created without a visible workspace record. Apply the latest Supabase migrations and try again.",
    };
  }

  await supabase
    .from("profiles")
    .update({ default_organization_id: organization.id })
    .eq("id", user.id)
    .is("default_organization_id", null);

  redirect("/dashboard");
}

export async function updateDefaultGymAction(
  _previousState: DefaultGymActionState,
  formData: FormData,
): Promise<DefaultGymActionState> {
  if (!hasSupabaseEnv()) {
    return createDefaultGymErrorState(MISSING_SUPABASE_ENV_MESSAGE);
  }

  const parsedValue = updateDefaultGymSchema.safeParse({
    organizationId:
      typeof formData.get("organizationId") === "string"
        ? formData.get("organizationId")
        : "",
  });

  if (!parsedValue.success) {
    return createDefaultGymErrorState("Choose a valid gym workspace.", {
      organizationId: parsedValue.error.issues[0]?.message,
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/profile");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", parsedValue.data.organizationId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    return createDefaultGymErrorState(membershipError.message);
  }

  if (!membership) {
    return createDefaultGymErrorState(
      "You can only set a default gym you actively belong to.",
    );
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ default_organization_id: parsedValue.data.organizationId })
    .eq("id", user.id);

  if (updateError) {
    return createDefaultGymErrorState(updateError.message);
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  revalidatePath("/dashboard/profile");

  return createDefaultGymSuccessState(parsedValue.data.organizationId);
}
