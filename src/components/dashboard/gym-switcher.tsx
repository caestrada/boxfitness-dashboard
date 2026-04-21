"use client";

import {
  Check,
  ChevronsUpDown,
  Dumbbell,
  LoaderCircle,
  PlusCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { updateDefaultGymAction } from "@/app/dashboard/actions";
import { initialDefaultGymActionState } from "@/app/dashboard/default-gym-action-state";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { DashboardGym } from "@/lib/dashboard";
import { cn } from "@/lib/utils";

interface GymSwitcherProps {
  activeGym: DashboardGym | null;
  gyms: DashboardGym[];
  hasSavedDefaultGym: boolean;
}

export function GymSwitcher({
  activeGym,
  gyms,
  hasSavedDefaultGym,
}: GymSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routePath = pathname.startsWith("/dashboard/gyms/new")
    ? "/dashboard"
    : pathname;
  const [defaultGymState, defaultGymFormAction, defaultGymPending] =
    useActionState(updateDefaultGymAction, initialDefaultGymActionState);
  const lastHandledSubmissionIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!defaultGymState.message || !defaultGymState.submissionId) {
      return;
    }

    if (lastHandledSubmissionIdRef.current === defaultGymState.submissionId) {
      return;
    }

    lastHandledSubmissionIdRef.current = defaultGymState.submissionId;

    if (defaultGymState.status === "error") {
      toast.error(defaultGymState.message);
      return;
    }

    startTransition(() => {
      router.refresh();
    });
  }, [
    defaultGymState.message,
    defaultGymState.status,
    defaultGymState.submissionId,
    router,
  ]);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="surface-control data-[state=open]:bg-sidebar-accent"
            >
              <div className="flex size-11 items-center justify-center rounded-[1.1rem] bg-primary text-primary-foreground shadow-[0_14px_30px_-22px_rgba(255,107,44,0.75)]">
                <Dumbbell className="size-5" />
              </div>

              <div className="grid min-w-0 flex-1 gap-0.5 text-left">
                <span className="block font-mono text-[10px] uppercase tracking-[0.26em] text-primary/75">
                  Box Fitness
                </span>
                <span className="block text-sm font-semibold leading-tight text-foreground">
                  {activeGym?.name ?? "No gyms yet"}
                </span>
                <span className="block text-xs leading-[1.35] text-muted-foreground">
                  {activeGym
                    ? hasSavedDefaultGym
                      ? `${gyms.length} connected gyms`
                      : "Choose a saved default gym"
                    : "Create your first gym"}
                </span>
              </div>

              <ChevronsUpDown className="ml-auto shrink-0 self-center text-muted-foreground" />
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
                const isActive = activeGym?.id === gym.id;

                return (
                  <DropdownMenuItem asChild key={gym.id}>
                    <form action={defaultGymFormAction} className="w-full">
                      <input
                        name="organizationId"
                        type="hidden"
                        value={gym.id}
                      />
                      <button
                        className="flex w-full items-center gap-3"
                        disabled={defaultGymPending && isActive}
                        type="submit"
                      >
                        <div
                          className={cn(
                            "surface-control flex size-9 items-center justify-center rounded-[1rem]",
                            isActive &&
                              "border-primary/25 bg-primary/10 text-primary hover:bg-primary/10",
                          )}
                        >
                          {defaultGymPending && isActive ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : isActive ? (
                            <Check className="size-4" />
                          ) : (
                            <Dumbbell className="size-4" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 text-left">
                          <p className="truncate font-medium text-foreground">
                            {gym.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {isActive
                              ? hasSavedDefaultGym
                                ? "Current default gym"
                                : "Current fallback workspace"
                              : `Set as default and refresh ${routePath}`}
                          </p>
                        </div>
                      </button>
                    </form>
                  </DropdownMenuItem>
                );
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
  );
}
