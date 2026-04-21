import { describe, expect, it } from "vitest";

import { getMemberStatusMeta, parseMemberDirectoryRows } from "@/lib/members";

const baseRow = {
  id: "membership-1",
  organization_id: "00000000-0000-0000-0000-000000000001",
  status: "active" as const,
  membership_plan: "Monthly",
  joined_at: "2026-01-01T00:00:00.000Z",
  last_visit_at: null,
  outstanding_balance_cents: 0,
  member: {
    id: "member-1",
    full_name: "  Jane Doe  ",
    email: "  jane@example.com  ",
    phone: "",
  },
};

describe("parseMemberDirectoryRows", () => {
  it("returns an empty array for invalid input", () => {
    expect(parseMemberDirectoryRows(null)).toEqual([]);
    expect(parseMemberDirectoryRows({})).toEqual([]);
    expect(parseMemberDirectoryRows("not an array")).toEqual([]);
  });

  it("trims the member name and normalizes optional fields", () => {
    const [row] = parseMemberDirectoryRows([baseRow]);

    expect(row).toMatchObject({
      id: "membership-1",
      memberId: "member-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: null,
      status: "active",
      membershipPlan: "Monthly",
      joinedAt: "2026-01-01T00:00:00.000Z",
      lastVisitAt: null,
      outstandingBalanceCents: 0,
    });
  });

  it("unwraps a single-element member array", () => {
    const [row] = parseMemberDirectoryRows([
      { ...baseRow, member: [baseRow.member] },
    ]);

    expect(row.memberId).toBe("member-1");
  });

  it("drops rows whose member is missing", () => {
    expect(
      parseMemberDirectoryRows([{ ...baseRow, member: null }]),
    ).toHaveLength(0);
  });

  it("clamps negative outstanding balances to zero", () => {
    const [row] = parseMemberDirectoryRows([
      { ...baseRow, outstanding_balance_cents: -500 },
    ]);

    expect(row.outstandingBalanceCents).toBe(0);
  });
});

describe("getMemberStatusMeta", () => {
  it("returns a label for every known status", () => {
    expect(getMemberStatusMeta("active").label).toBe("Active");
    expect(getMemberStatusMeta("lead").label).toBe("Lead");
    expect(getMemberStatusMeta("frozen").label).toBe("Frozen");
    expect(getMemberStatusMeta("inactive").label).toBe("Inactive");
  });
});
