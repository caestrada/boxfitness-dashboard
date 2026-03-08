import { z } from "zod/v3"

const dashboardGymSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1),
})

const dashboardBillingOrganizationSchema = dashboardGymSchema.extend({
  stripe_customer_id: z.string().nullable().optional(),
  subscription_tier: z.string().nullable().optional(),
  subscription_status: z.string().nullable().optional(),
  subscription_current_period_end: z.string().nullable().optional(),
  subscription_cancel_at_period_end: z.boolean().nullable().optional(),
})

const dashboardOrganizationMembershipSchema = z.object({
  organization_id: z.string().min(1),
  role: z.enum(["owner", "admin", "staff"]).nullable().optional(),
  status: z.enum(["active", "invited", "suspended"]).nullable().optional(),
})

const dashboardProfileSchema = z.object({
  email: z.string().nullable().optional(),
  full_name: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
})

export type DashboardGym = z.infer<typeof dashboardGymSchema>

export interface DashboardBillingOrganization extends DashboardGym {
  role: "owner" | "admin" | "staff" | null
  stripeCustomerId: string | null
  subscriptionTier: string | null
  subscriptionStatus: string | null
  subscriptionCurrentPeriodEnd: string | null
  subscriptionCancelAtPeriodEnd: boolean
}

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

export function parseDashboardBillingOrganizations(
  organizationRows: unknown,
  membershipRows: unknown
) {
  const parsedOrganizations = z.array(dashboardBillingOrganizationSchema).safeParse(organizationRows)
  const parsedMemberships = z
    .array(dashboardOrganizationMembershipSchema)
    .safeParse(membershipRows)

  if (!parsedOrganizations.success) {
    return [] as DashboardBillingOrganization[]
  }

  const membershipByOrganizationId = new Map<
    string,
    DashboardBillingOrganization["role"]
  >()

  if (parsedMemberships.success) {
    for (const membership of parsedMemberships.data) {
      if (membership.status !== "active") {
        continue
      }

      membershipByOrganizationId.set(membership.organization_id, membership.role ?? null)
    }
  }

  return parsedOrganizations.data.map((organization) => ({
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    role: membershipByOrganizationId.get(organization.id) ?? null,
    stripeCustomerId: normalizeOptionalString(organization.stripe_customer_id),
    subscriptionTier: normalizeOptionalString(organization.subscription_tier),
    subscriptionStatus: normalizeOptionalString(organization.subscription_status),
    subscriptionCurrentPeriodEnd: normalizeOptionalString(
      organization.subscription_current_period_end
    ),
    subscriptionCancelAtPeriodEnd: Boolean(organization.subscription_cancel_at_period_end),
  }))
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

export function getRequestedGymSlug(
  value: FormDataEntryValue | string | string[] | null | undefined
) {
  if (typeof value === "string") {
    const trimmedValue = value.trim()
    return trimmedValue.length > 0 ? trimmedValue : null
  }

  if (Array.isArray(value)) {
    return getRequestedGymSlug(value[0] ?? null)
  }

  return null
}

export function resolveActiveGym<T extends { slug: string }>(
  gyms: T[],
  requestedGymSlug: string | null
) {
  return gyms.find((gym) => gym.slug === requestedGymSlug) ?? gyms[0] ?? null
}

export function getDashboardPathWithGym(pathname: string, gymSlug: string | null) {
  if (!gymSlug) {
    return pathname
  }

  const separator = pathname.includes("?") ? "&" : "?"
  return `${pathname}${separator}gym=${encodeURIComponent(gymSlug)}`
}
