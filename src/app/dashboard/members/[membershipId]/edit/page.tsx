import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getScopedMemberRecord } from "@/app/dashboard/members/member-record";
import { EditMemberForm } from "@/components/dashboard/add-member-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const memberSecondaryButtonClassName =
  "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary";

function formatOutstandingBalanceInput(valueInCents: number) {
  return (Math.max(0, valueInCents) / 100).toFixed(2);
}

export default async function EditMemberPage({
  params,
}: {
  params: Promise<{ membershipId: string }>;
}) {
  const { membershipId } = await params;
  const { activeGym, member } = await getScopedMemberRecord(
    membershipId,
    `/dashboard/members/${membershipId}/edit`,
  );

  if (!activeGym) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create a gym first</CardTitle>
            <CardDescription>
              Members can only be managed inside an active gym workspace.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!member) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6">
      <div className="flex items-center">
        <Button
          asChild
          className={memberSecondaryButtonClassName}
          variant="outline"
        >
          <Link href={`/dashboard/members/${member.id}`}>
            <ArrowLeft className="size-4" />
            Back to profile
          </Link>
        </Button>
      </div>

      <EditMemberForm
        initialValues={{
          email: member.email ?? "",
          fullName: member.fullName,
          joinedAt: member.joinedAt ?? "",
          membershipPlan: member.membershipPlan ?? "",
          outstandingBalance: formatOutstandingBalanceInput(
            member.outstandingBalanceCents,
          ),
          phone: member.phone ?? "",
          status: member.status,
        }}
        memberId={member.memberId}
        membershipId={member.id}
        organizationId={activeGym.id}
        organizationName={activeGym.name}
      />
    </div>
  );
}
