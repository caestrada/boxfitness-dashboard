"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Search, Users } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { MemberDirectoryRow } from "@/lib/members";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  emptyDescription: string;
  emptyTitle: string;
  gymName: string;
  availablePlans: string[];
}

export function DataTable<TData extends MemberDirectoryRow, TValue>({
  columns,
  data,
  emptyDescription,
  emptyTitle,
  gymName,
  availablePlans,
}: DataTableProps<TData, TValue>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sorting, setSorting] = useState<SortingState>([
    { id: "joinedAt", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // TanStack Table manages imperative table state outside React Compiler memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      globalFilter: deferredSearchQuery,
      sorting,
    },
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const normalizedFilterValue = String(filterValue ?? "")
        .trim()
        .toLowerCase();

      if (!normalizedFilterValue) {
        return true;
      }

      return [
        row.original.fullName,
        row.original.email ?? "",
        row.original.phone ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedFilterValue);
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
  });

  const statusFilterValue =
    (table.getColumn("status")?.getFilterValue() as string | undefined) ??
    "all";
  const planFilterValue =
    (table.getColumn("membershipPlan")?.getFilterValue() as
      | string
      | undefined) ?? "all";
  const filteredRowCount = table.getFilteredRowModel().rows.length;
  const visibleRowCount = table.getRowModel().rows.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="section-label">Directory</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Showing {visibleRowCount} of {filteredRowCount} filtered members in{" "}
            {gymName}.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
          <div className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search members"
              className="pl-11"
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name, email, or phone"
              value={searchQuery}
            />
          </div>

          <Select
            onValueChange={(value) =>
              table
                .getColumn("status")
                ?.setFilterValue(value === "all" ? undefined : value)
            }
            value={statusFilterValue}
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

          <Select
            onValueChange={(value) =>
              table
                .getColumn("membershipPlan")
                ?.setFilterValue(value === "all" ? undefined : value)
            }
            value={planFilterValue}
          >
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

      <div className="overflow-hidden rounded-md border border-border/70">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  data-state={row.getIsSelected() && "selected"}
                  key={row.id}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-28 text-center"
                  colSpan={columns.length}
                >
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="size-5" />
                    </div>
                    <p className="mt-4 text-base font-semibold text-foreground">
                      {emptyTitle}
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                      {emptyDescription}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {data.length === 0
            ? "No member records yet."
            : `Page ${table.getState().pagination.pageIndex + 1} of ${Math.max(table.getPageCount(), 1)}`}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              onValueChange={(value) => table.setPageSize(Number(value))}
              value={`${table.getState().pagination.pageSize}`}
            >
              <SelectTrigger className="h-9 w-[7.5rem] rounded-full bg-white/80 dark:bg-input/90">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <ChevronLeft className="size-4" />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              size="icon-sm"
              type="button"
              variant="outline"
            >
              <ChevronRight className="size-4" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
