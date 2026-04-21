import { z } from "zod/v3";

const memberPersonSchema = z.object({
  id: z.string().min(1),
  full_name: z.string().trim().min(1),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

const memberOrganizationRowSchema = z.object({
  id: z.string().min(1),
  organization_id: z.string().uuid(),
  status: z.enum(["lead", "active", "frozen", "inactive"]),
  membership_plan: z.string().nullable().optional(),
  joined_at: z.string().nullable().optional(),
  last_visit_at: z.string().nullable().optional(),
  outstanding_balance_cents: z.number().int().nullable().optional(),
  member: z
    .union([memberPersonSchema, z.array(memberPersonSchema).max(1)])
    .nullable()
    .optional(),
});

export interface MemberDirectoryRow {
  id: string;
  memberId: string;
  organizationId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  status: "lead" | "active" | "frozen" | "inactive";
  membershipPlan: string | null;
  joinedAt: string | null;
  lastVisitAt: string | null;
  outstandingBalanceCents: number;
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function resolveMemberPerson(
  value: z.infer<typeof memberOrganizationRowSchema>["member"],
) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function parseMemberDirectoryRows(value: unknown) {
  const parsedValue = z.array(memberOrganizationRowSchema).safeParse(value);

  if (!parsedValue.success) {
    return [] as MemberDirectoryRow[];
  }

  return parsedValue.data.flatMap((row) => {
    const member = resolveMemberPerson(row.member);

    if (!member) {
      return [];
    }

    return [
      {
        id: row.id,
        memberId: member.id,
        organizationId: row.organization_id,
        fullName: member.full_name.trim(),
        email: normalizeOptionalString(member.email),
        phone: normalizeOptionalString(member.phone),
        status: row.status,
        membershipPlan: normalizeOptionalString(row.membership_plan),
        joinedAt: normalizeOptionalString(row.joined_at),
        lastVisitAt: normalizeOptionalString(row.last_visit_at),
        outstandingBalanceCents: Math.max(
          0,
          row.outstanding_balance_cents ?? 0,
        ),
      },
    ];
  });
}

export function getMemberStatusMeta(status: MemberDirectoryRow["status"]) {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className:
          "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
      };
    case "lead":
      return {
        label: "Lead",
        className:
          "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
      };
    case "frozen":
      return {
        label: "Frozen",
        className:
          "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
      };
    default:
      return {
        label: "Inactive",
        className: "border-border bg-secondary text-muted-foreground",
      };
  }
}
