"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod/v3"

import type {
  ProfileAvatarActionFieldErrors,
  ProfileAvatarActionState,
  ProfileDetailsActionState,
} from "@/app/dashboard/profile/profile-action-state"
import { getSupabaseEnv, hasSupabaseEnv, MISSING_SUPABASE_ENV_MESSAGE } from "@/lib/env"
import {
  getProfileAvatarFileExtension,
  getProfileAvatarStoragePath,
  PROFILE_AVATAR_BUCKET,
  PROFILE_AVATAR_ALLOWED_MIME_TYPES,
  PROFILE_AVATAR_MAX_BYTES,
  PROFILE_AVATAR_MAX_SIZE_LABEL,
} from "@/lib/profile-avatar"
import { createClient } from "@/lib/supabase/server"

const MISSING_PROFILES_TABLE_MESSAGE =
  "This Supabase project is missing the `profiles` table. Apply the migrations in `supabase/migrations/` to the cloud project, then retry."

const profileDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .max(120, "Full name must be 120 characters or fewer."),
})

function createSubmissionId() {
  return crypto.randomUUID()
}

function getAvatarFormIntent(formData: FormData) {
  return formData.getAll("intent").includes("remove") ? "remove" : "upload"
}

function getProfilesTableErrorMessage(message: string) {
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes("public.profiles") &&
    normalizedMessage.includes("schema cache")
  ) {
    return MISSING_PROFILES_TABLE_MESSAGE
  }

  return message
}

function createErrorState(
  message: string,
  fieldErrors?: ProfileAvatarActionFieldErrors
): ProfileAvatarActionState {
  return {
    status: "error",
    message,
    fieldErrors,
    submissionId: createSubmissionId(),
  }
}

function createSuccessState(
  message: string,
  avatarUrl: string | null
): ProfileAvatarActionState {
  return {
    status: "success",
    message,
    avatarUrl,
    submissionId: createSubmissionId(),
  }
}

function createProfileDetailsErrorState(
  message: string,
  fieldErrors?: ProfileDetailsActionState["fieldErrors"]
): ProfileDetailsActionState {
  return {
    status: "error",
    message,
    fieldErrors,
    submissionId: createSubmissionId(),
  }
}

function createProfileDetailsSuccessState(
  message: string,
  fullName: string | null
): ProfileDetailsActionState {
  return {
    status: "success",
    message,
    fullName,
    submissionId: createSubmissionId(),
  }
}

function normalizeFullName(value: string) {
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

export async function updateProfileAvatarAction(
  _previousState: ProfileAvatarActionState,
  formData: FormData
): Promise<ProfileAvatarActionState> {
  if (!hasSupabaseEnv()) {
    return createErrorState(MISSING_SUPABASE_ENV_MESSAGE)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/profile")
  }

  const { supabaseUrl } = getSupabaseEnv()
  const intent = getAvatarFormIntent(formData)

  const { data: currentProfile, error: currentProfileError } = await supabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  if (currentProfileError) {
    return createErrorState(getProfilesTableErrorMessage(currentProfileError.message))
  }

  const currentAvatarUrl =
    typeof currentProfile?.avatar_url === "string" && currentProfile.avatar_url.trim().length > 0
      ? currentProfile.avatar_url
      : null
  const currentStoragePath = getProfileAvatarStoragePath(currentAvatarUrl, supabaseUrl)

  if (intent === "remove") {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", user.id)

    if (updateError) {
      return createErrorState(getProfilesTableErrorMessage(updateError.message))
    }

    if (currentStoragePath) {
      await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([currentStoragePath])
    }

    revalidatePath("/dashboard", "layout")
    revalidatePath("/dashboard/profile")

    return createSuccessState("Avatar removed.", null)
  }

  const avatarEntry = formData.get("avatar")
  const avatarFile = avatarEntry instanceof File ? avatarEntry : null

  if (!avatarFile || avatarFile.size === 0) {
    return createErrorState("Select an image to continue.", {
      avatar: "Choose a JPG, PNG, WebP, or GIF file before saving.",
    })
  }

  if (avatarFile.size > PROFILE_AVATAR_MAX_BYTES) {
    return createErrorState(`Avatar images must be ${PROFILE_AVATAR_MAX_SIZE_LABEL} or smaller.`, {
      avatar: `Upload an image no larger than ${PROFILE_AVATAR_MAX_SIZE_LABEL}.`,
    })
  }

  if (
    !PROFILE_AVATAR_ALLOWED_MIME_TYPES.includes(
      avatarFile.type as (typeof PROFILE_AVATAR_ALLOWED_MIME_TYPES)[number]
    )
  ) {
    return createErrorState("Unsupported image format.", {
      avatar: "Use a JPG, PNG, WebP, or GIF image.",
    })
  }

  const fileExtension = getProfileAvatarFileExtension(avatarFile.name, avatarFile.type)

  if (!fileExtension) {
    return createErrorState("Unsupported image format.", {
      avatar: "Use a JPG, PNG, WebP, or GIF image.",
    })
  }

  const nextStoragePath = `${user.id}/${crypto.randomUUID()}.${fileExtension}`
  const { error: uploadError } = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(nextStoragePath, avatarFile, {
      cacheControl: "31536000",
      contentType: avatarFile.type,
      upsert: false,
    })

  if (uploadError) {
    return createErrorState(uploadError.message)
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(nextStoragePath)

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id)

  if (updateError) {
    await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([nextStoragePath])
    return createErrorState(getProfilesTableErrorMessage(updateError.message))
  }

  if (currentStoragePath) {
    await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([currentStoragePath])
  }

  revalidatePath("/dashboard", "layout")
  revalidatePath("/dashboard/profile")

  return createSuccessState("Avatar updated.", publicUrl)
}

export async function updateProfileDetailsAction(
  _previousState: ProfileDetailsActionState,
  formData: FormData
): Promise<ProfileDetailsActionState> {
  if (!hasSupabaseEnv()) {
    return createProfileDetailsErrorState(MISSING_SUPABASE_ENV_MESSAGE)
  }

  const parsedValue = profileDetailsSchema.safeParse({
    fullName: typeof formData.get("fullName") === "string" ? formData.get("fullName") : "",
  })

  if (!parsedValue.success) {
    return createProfileDetailsErrorState("Fix the highlighted field and try again.", {
      fullName: parsedValue.error.issues[0]?.message,
    })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth?redirectTo=/dashboard/profile")
  }

  const nextFullName = normalizeFullName(parsedValue.data.fullName)
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ full_name: nextFullName })
    .eq("id", user.id)

  if (updateError) {
    return createProfileDetailsErrorState(getProfilesTableErrorMessage(updateError.message))
  }

  revalidatePath("/dashboard", "layout")
  revalidatePath("/dashboard/profile")

  return createProfileDetailsSuccessState("Profile updated.", nextFullName)
}
