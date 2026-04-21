import { ArrowLeft, PencilLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getScopedMemberRecord } from "@/app/dashboard/members/member-record";
import { MemberDeleteButton } from "@/components/dashboard/member-delete-action";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getMemberStatusMeta } from "@/lib/members";
import { cn } from "@/lib/utils";

const memberPrimaryButtonClassName =
  "bg-primary text-primary-foreground shadow-[0_18px_36px_-24px_rgba(255,107,44,0.7)] hover:bg-primary/90";

const memberSecondaryButtonClassName =
  "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary";

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

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  const { membershipId } = await params;
  const { activeGym, member } = await getScopedMemberRecord(
    membershipId,
    `/dashboard/members/${membershipId}`,
  );

  if (!activeGym) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create a gym first</CardTitle>
            <CardDescription>
              Member profiles are only available inside an active gym workspace.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!member) {
    notFound();
  }

  const statusMeta = getMemberStatusMeta(member.status);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          asChild
          className={memberSecondaryButtonClassName}
          variant="outline"
        >
          <Link href="/dashboard/members">
            <ArrowLeft className="size-4" />
            Back to members
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild className={memberPrimaryButtonClassName}>
            <Link href={`/dashboard/members/${member.id}/edit`}>
              <PencilLine className="size-4" />
              Edit Member
            </Link>
          </Button>
          <MemberDeleteButton
            memberId={member.memberId}
            memberName={member.fullName}
            membershipId={member.id}
            organizationId={member.organizationId}
            redirectTo="/dashboard/members"
          />
        </div>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="space-y-2">
            <CardTitle className="text-3xl">{member.fullName}</CardTitle>
            <CardDescription>
              Member profile for {activeGym.name}.
            </CardDescription>
          </div>
          <span
            className={cn(
              "inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-medium",
              statusMeta.className,
            )}
          >
            {statusMeta.label}
          </span>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[1.25rem] border border-border/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="mt-2 text-base text-foreground">
              {member.email ?? "No email on file"}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">Phone</p>
            <p className="mt-2 text-base text-foreground">
              {member.phone ?? "No phone on file"}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Membership plan
            </p>
            <p className="mt-2 text-base text-foreground">
              {member.membershipPlan ?? "Unassigned"}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">Joined</p>
            <p className="mt-2 text-base text-foreground">
              {formatDate(member.joinedAt, "Not set")}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Last visit
            </p>
            <p className="mt-2 text-base text-foreground">
              {formatDate(member.lastVisitAt, "No visits yet")}
            </p>
          </div>
          <div className="rounded-[1.25rem] border border-border/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Outstanding balance
            </p>
            <p className="mt-2 text-base text-foreground">
              {member.outstandingBalanceCents > 0
                ? formatCurrency(member.outstandingBalanceCents)
                : "$0.00"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
