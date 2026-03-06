"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check, ChevronsUpDown, Dumbbell, PlusCircle } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import type { DashboardGym } from "@/lib/dashboard"
import { cn } from "@/lib/utils"

interface GymSwitcherProps {
  gyms: DashboardGym[]
}

export function GymSwitcher({ gyms }: GymSwitcherProps) {
  const searchParams = useSearchParams()
  const requestedGymSlug = searchParams.get("gym")
  const activeGym = gyms.find((gym) => gym.slug === requestedGymSlug) ?? gyms[0] ?? null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="border border-white/10 bg-white/5 data-[state=open]:bg-sidebar-accent"
            >
              <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Dumbbell className="size-5" />
              </div>

              <div className="grid flex-1 text-left leading-tight">
                <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-primary/75">
                  Box Fitness
                </span>
                <span className="truncate text-sm font-semibold text-foreground">
                  {activeGym?.name ?? "No gyms yet"}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {activeGym ? `${gyms.length} connected gyms` : "Create your first gym"}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-72"
            side="bottom"
            sideOffset={12}
          >
            <DropdownMenuLabel className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              Gyms
            </DropdownMenuLabel>

            {gyms.length > 0 ? (
              gyms.map((gym) => {
                const isActive = activeGym?.id === gym.id

                return (
                  <DropdownMenuItem asChild key={gym.id}>
                    <Link
                      className="flex items-center gap-3"
                      href={`/dashboard?gym=${gym.slug}`}
                    >
                      <div
                        className={cn(
                          "flex size-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5",
                          isActive && "border-primary/20 bg-primary/10 text-primary"
                        )}
                      >
                        {isActive ? <Check className="size-4" /> : <Dumbbell className="size-4" />}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{gym.name}</p>
                        <p className="truncate text-xs text-muted-foreground">/{gym.slug}</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                )
              })
            ) : (
              <DropdownMenuItem disabled>No gyms yet</DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/dashboard/gyms/new">
                <PlusCircle className="size-4" />
                Create new gym
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
