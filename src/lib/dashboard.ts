import { z } from "zod/v3"

const dashboardGymSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
})

const dashboardProfileSchema = z.object({
  email: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
})

export type DashboardGym = z.infer<typeof dashboardGymSchema>

export interface DashboardUserProfile {
  email: string | null
  fullName: string | null
  avatarUrl: string | null
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

export function parseDashboardGyms(value: unknown) {
  const parsedValue = z.array(dashboardGymSchema).safeParse(value)
  return parsedValue.success ? parsedValue.data : []
}

export function parseDashboardProfile(
  value: unknown,
  fallbackEmail: string | null
): DashboardUserProfile {
  const parsedValue = dashboardProfileSchema.safeParse(value)

  if (!parsedValue.success) {
    return {
      email: normalizeOptionalString(fallbackEmail),
      fullName: null,
      avatarUrl: null,
    }
  }

  return {
    email: normalizeOptionalString(parsedValue.data.email) ?? normalizeOptionalString(fallbackEmail),
    fullName: normalizeOptionalString(parsedValue.data.full_name),
    avatarUrl: normalizeOptionalString(parsedValue.data.avatar_url),
  }
}

export function getUserDisplayName(profile: DashboardUserProfile) {
  return profile.fullName ?? profile.email ?? "Box Fitness User"
}

export function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) {
    return "BF"
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase()
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase()
}
