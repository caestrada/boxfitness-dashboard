"use client"

import { useDeferredValue, useState } from "react"
import { format } from "date-fns"
import { Search, Users } from "lucide-react"

import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  getMemberStatusMeta,
  type MemberDirectoryRow,
} from "@/lib/members"

interface MembersTableProps {
  gymName: string
  rows: MemberDirectoryRow[]
}

function formatDate(value: string | null, fallback: string) {
  if (!value) {
    return fallback
  }

  const parsedDate = new Date(value)

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback
  }

  return format(parsedDate, "MMM d, yyyy")
}

function formatCurrency(valueInCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(valueInCents / 100)
}

export function MembersTable({ gymName, rows }: MembersTableProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | MemberDirectoryRow["status"]>("all")
  const [planFilter, setPlanFilter] = useState("all")
  const deferredSearchQuery = useDeferredValue(searchQuery)

  const normalizedQuery = deferredSearchQuery.trim().toLowerCase()
  const availablePlans = Array.from(
    new Set(rows.map((row) => row.membershipPlan).filter((value): value is string => Boolean(value)))
  ).sort((left, right) => left.localeCompare(right))

  const filteredRows = rows.filter((row) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      row.fullName.toLowerCase().includes(normalizedQuery) ||
      row.email?.toLowerCase().includes(normalizedQuery) ||
      row.phone?.toLowerCase().includes(normalizedQuery)

    const matchesStatus = statusFilter === "all" || row.status === statusFilter
    const matchesPlan = planFilter === "all" || row.membershipPlan === planFilter

    return matchesQuery && matchesStatus && matchesPlan
  })

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-label">Directory</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Showing {filteredRows.length} of {rows.length} members in {gymName}.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search members"
              className="pl-11"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, email, or phone"
              value={searchQuery}
            />
          </label>

          <Select
            onValueChange={(value) =>
              setStatusFilter(value as "all" | MemberDirectoryRow["status"])
            }
            value={statusFilter}
          >
            <SelectTrigger
              aria-label="Filter members by status"
              className="h-11 w-full rounded-[1rem] bg-white/80 px-4 dark:bg-input/90"
            >
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="frozen">Frozen</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={setPlanFilter} value={planFilter}>
            <SelectTrigger
              aria-label="Filter members by plan"
              className="h-11 w-full rounded-[1rem] bg-white/80 px-4 dark:bg-input/90"
            >
              <SelectValue placeholder="All plans" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {availablePlans.map((plan) => (
                <SelectItem key={plan} value={plan}>
                  {plan}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.6rem] border border-border/70 bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Member</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Visit</TableHead>
              <TableHead className="text-right">Outstanding</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filteredRows.length > 0 ? (
              filteredRows.map((row) => {
                const statusMeta = getMemberStatusMeta(row.status)

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium text-foreground">{row.fullName}</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          {row.email ? <span>{row.email}</span> : null}
                          {row.phone ? <span>{row.phone}</span> : null}
                          {!row.email && !row.phone ? <span>No contact details yet</span> : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
                          statusMeta.className
                        )}
                      >
                        {statusMeta.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.membershipPlan ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.joinedAt, "Not set")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(row.lastVisitAt, "No visits")}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {row.outstandingBalanceCents > 0
                        ? formatCurrency(row.outstandingBalanceCents)
                        : "$0.00"}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell className="px-6 py-12" colSpan={6}>
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="size-5" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-foreground">
                      {rows.length === 0
                        ? `No members have been added to ${gymName} yet.`
                        : "No members match the current filters."}
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      {rows.length === 0
                        ? "This directory is scoped to the active gym workspace. Once member records are created for this gym, they will appear here."
                        : "Adjust the search, status, or plan filters to widen the directory."}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
