"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Users,
} from "lucide-react"

import { GymSwitcher } from "@/components/dashboard/gym-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import type { DashboardGym } from "@/lib/dashboard"

interface AppSidebarProps {
  gyms: DashboardGym[]
}

const primaryItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    matches: ["/dashboard"],
  },
  {
    title: "Gyms",
    href: "/dashboard/gyms/new",
    icon: Building2,
    matches: ["/dashboard/gyms"],
  },
] as const

const roadmapItems = [
  {
    title: "Members",
    icon: Users,
  },
  {
    title: "Classes",
    icon: CalendarDays,
  },
  {
    title: "Billing",
    icon: CreditCard,
  },
  {
    title: "Analytics",
    icon: BarChart3,
  },
] as const

export function AppSidebar({ gyms }: AppSidebarProps) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader>
        <GymSwitcher gyms={gyms} />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => {
                const isActive = item.matches.some((match) =>
                  match === "/dashboard" ? pathname === match : pathname.startsWith(match)
                )

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Planned</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {roadmapItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton disabled type="button">
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                    <SidebarMenuBadge>Soon</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="rounded-[1.5rem] border border-white/10 bg-black/20 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-primary/75">
            Foundation
          </p>
          <p className="mt-3 text-sm font-semibold text-foreground">
            {gyms.length > 0 ? `${gyms.length} gym workspace${gyms.length > 1 ? "s" : ""}` : "Gym shell ready"}
          </p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Switch gyms from the header dropdown and add new locations without leaving
            the dashboard shell.
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
