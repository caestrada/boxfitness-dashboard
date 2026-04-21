"use client";

import { usePathname } from "next/navigation";

interface DashboardShellHeaderProps {
  gymCount: number;
}

function getGymWorkspaceCopy(gymCount: number) {
  return `${gymCount} gym workspace${gymCount === 1 ? "" : "s"} connected`;
}

function getDashboardHeaderContent(pathname: string, gymCount: number) {
  if (pathname.startsWith("/dashboard/profile")) {
    return {
      label: "Account Settings",
      title: "Manage your Box Fitness account",
    };
  }

  if (pathname.startsWith("/dashboard/gyms/new")) {
    return {
      label: "Gyms",
      title:
        gymCount > 0
          ? "Add another gym workspace"
          : "Create your first gym workspace",
    };
  }

  return {
    label: "Dashboard",
    title:
      gymCount > 0
        ? getGymWorkspaceCopy(gymCount)
        : "Create your first gym workspace",
  };
}

export function DashboardShellHeader({ gymCount }: DashboardShellHeaderProps) {
  const pathname = usePathname();
  const { label, title } = getDashboardHeaderContent(pathname, gymCount);

  return (
    <>
      <p className="section-label">{label}</p>
      <p className="truncate text-base font-semibold tracking-[-0.02em] text-foreground">
        {title}
      </p>
    </>
  );
}
