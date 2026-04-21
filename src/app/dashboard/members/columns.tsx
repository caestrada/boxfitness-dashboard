"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Ellipsis, Eye, PencilLine } from "lucide-react";
import Link from "next/link";

import { MemberDeleteMenuItem } from "@/components/dashboard/member-delete-action";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMemberStatusMeta, type MemberDirectoryRow } from "@/lib/members";
import { cn } from "@/lib/utils";

function formatDate(value: string | null, fallback: string) {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsedDate);
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(valueInCents / 100);
}

function MemberRowActions({ member }: { member: MemberDirectoryRow }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${member.fullName}`}
          className="ml-auto flex size-8 items-center justify-center rounded-full"
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Ellipsis className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="text-primary focus:bg-primary/10 focus:text-primary"
        >
          <Link href={`/dashboard/members/${member.id}`}>
            <Eye className="size-4" />
            View Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          asChild
          className="text-primary focus:bg-primary/10 focus:text-primary"
        >
          <Link href={`/dashboard/members/${member.id}/edit`}>
            <PencilLine className="size-4" />
            Edit Member
          </Link>
        </DropdownMenuItem>
        <MemberDeleteMenuItem
          memberId={member.memberId}
          memberName={member.fullName}
          membershipId={member.id}
          organizationId={member.organizationId}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const columns: ColumnDef<MemberDirectoryRow>[] = [
  {
    id: "member",
    accessorFn: (row) => row.fullName,
    header: ({ column }) => (
      <Button
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        size="sm"
        type="button"
        variant="ghost"
      >
        Member
        <ArrowUpDown className="size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="space-y-1">
        <p className="font-medium text-foreground">{row.original.fullName}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {row.original.email ? <span>{row.original.email}</span> : null}
          {row.original.phone ? <span>{row.original.phone}</span> : null}
          {!row.original.email && !row.original.phone ? (
            <span>No contact details yet</span>
          ) : null}
        </div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        size="sm"
        type="button"
        variant="ghost"
      >
        Status
        <ArrowUpDown className="size-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const statusMeta = getMemberStatusMeta(row.original.status);

      return (
        <span
          className={cn(
            "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
            statusMeta.className,
          )}
        >
          {statusMeta.label}
        </span>
      );
    },
    filterFn: (row, columnId, value) => {
      if (!value || value === "all") {
        return true;
      }

      return row.getValue(columnId) === value;
    },
  },
  {
    accessorKey: "membershipPlan",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        size="sm"
        type="button"
        variant="ghost"
      >
        Plan
        <ArrowUpDown className="size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.membershipPlan ?? "Unassigned"}
      </span>
    ),
    sortingFn: (leftRow, rightRow) => {
      const leftValue = leftRow.original.membershipPlan ?? "Unassigned";
      const rightValue = rightRow.original.membershipPlan ?? "Unassigned";

      return leftValue.localeCompare(rightValue);
    },
    filterFn: (row, columnId, value) => {
      if (!value || value === "all") {
        return true;
      }

      return row.getValue(columnId) === value;
    },
  },
  {
    id: "joinedAt",
    accessorFn: (row) => row.joinedAt ?? "",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        size="sm"
        type="button"
        variant="ghost"
      >
        Joined
        <ArrowUpDown className="size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.joinedAt, "Not set")}
      </span>
    ),
    sortingFn: (leftRow, rightRow) => {
      const leftValue = leftRow.original.joinedAt
        ? new Date(leftRow.original.joinedAt).getTime()
        : 0;
      const rightValue = rightRow.original.joinedAt
        ? new Date(rightRow.original.joinedAt).getTime()
        : 0;

      return leftValue - rightValue;
    },
  },
  {
    id: "lastVisitAt",
    accessorFn: (row) => row.lastVisitAt ?? "",
    header: ({ column }) => (
      <Button
        className="-ml-3"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        size="sm"
        type="button"
        variant="ghost"
      >
        Last visit
        <ArrowUpDown className="size-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatDate(row.original.lastVisitAt, "No visits")}
      </span>
    ),
    sortingFn: (leftRow, rightRow) => {
      const leftValue = leftRow.original.lastVisitAt
        ? new Date(leftRow.original.lastVisitAt).getTime()
        : 0;
      const rightValue = rightRow.original.lastVisitAt
        ? new Date(rightRow.original.lastVisitAt).getTime()
        : 0;

      return leftValue - rightValue;
    },
  },
  {
    accessorKey: "outstandingBalanceCents",
    header: ({ column }) => (
      <div className="text-right">
        <Button
          className="ml-auto"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          size="sm"
          type="button"
          variant="ghost"
        >
          Outstanding
          <ArrowUpDown className="size-4" />
        </Button>
      </div>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-foreground">
        {row.original.outstandingBalanceCents > 0
          ? formatCurrency(row.original.outstandingBalanceCents)
          : "$0.00"}
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => <MemberRowActions member={row.original} />,
  },
];
