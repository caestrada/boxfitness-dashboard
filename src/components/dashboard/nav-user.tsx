"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type DashboardUserProfile,
  getInitials,
  getUserDisplayName,
} from "@/lib/dashboard";

interface NavUserProps {
  user: DashboardUserProfile;
}

export function NavUser({ user }: NavUserProps) {
  const displayName = getUserDisplayName(user);
  const initials = getInitials(displayName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="surface-control group flex min-w-0 items-center gap-3 rounded-full px-2.5 py-2 pr-4 text-left transition-all hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          type="button"
        >
          <Avatar className="size-10 border border-primary/15 bg-primary/10 shadow-[0_0_0_1px_rgba(255,107,44,0.08)]">
            <AvatarImage alt={displayName} src={user.avatarUrl ?? undefined} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-semibold tracking-[-0.01em] text-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground/90">
              {user.email ?? "Signed in"}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72" sideOffset={12}>
        <DropdownMenuLabel className="space-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {displayName}
          </p>
          <p className="truncate text-xs font-normal text-muted-foreground">
            {user.email ?? "Signed in"}
          </p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/dashboard/profile">Account Settings</Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <form action={signOutAction}>
          <DropdownMenuItem asChild variant="destructive">
            <button className="flex w-full items-center gap-2" type="submit">
              <LogOut className="size-4" />
              Sign out
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
