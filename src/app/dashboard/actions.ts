"use server"

import { redirect } from "next/navigation"
import { z } from "zod/v3"

import type { CreateGymActionState } from "@/app/dashboard/gym-action-state"
import { hasSupabaseEnv, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env"
import { createClient } from "@/lib/supabase/server"

const createGymSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Gym name must be at least 2 characters.")
    .max(120, "Gym name must be 120 characters or fewer."),
})

function slugifyGymName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80)
}

export async function createGymAction(
  _previousState: CreateGymActionState,
  formData: FormData
): Promise<CreateGymActionState> {
  if (!hasSupabaseEnv()) {
    return {
      status: "error",
      message: MISSING_SUPABASE_ENV_MESSAGE,
    }
  }

  const parsedValue = createGymSchema.safeParse({
    name: typeof formData.get("name") === "string" ? formData.get("name") : "",
  })

  if (!parsedValue.success) {
    return {
      status: "error",
      message: "Fix the highlighted field and try again.",
      fieldErrors: {
        name: parsedValue.error.issues[0]?.message,
      },
    }
  }

  const slug = slugifyGymName(parsedValue.data.name)

  if (!slug) {
    return {
      status: "error",
      message: "Gym name must include letters or numbers.",
      fieldErrors: {
        name: "Enter a gym name that can produce a valid URL slug.",
      },
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/gyms/new")
  }

  const { data: createdOrganizations, error: organizationError } = await supabase.rpc(
    "create_organization_with_owner",
    {
      organization_name_input: parsedValue.data.name,
      organization_slug_input: slug,
    }
  )

  if (organizationError) {
    if (organizationError.code === "23505") {
      return {
        status: "error",
        message: "That gym slug is already taken. Pick a more specific name.",
        fieldErrors: {
          name: "Try a more distinct gym name so the generated slug is unique.",
        },
      }
    }

    return {
      status: "error",
      message: organizationError.message,
    }
  }

  const organization = Array.isArray(createdOrganizations)
    ? createdOrganizations[0]
    : createdOrganizations

  if (!organization?.slug) {
    return {
      status: "error",
      message: "The gym was created without a visible workspace record. Apply the latest Supabase migrations and try again.",
    }
  }

  redirect(`/dashboard?gym=${organization.slug}`)
}
