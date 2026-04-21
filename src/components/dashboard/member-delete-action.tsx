"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CircleAlert, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteMemberAction } from "@/app/dashboard/members/actions"
import { Button } from "@/components/ui/button"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface BaseMemberDeleteActionProps {
  memberId: string
  memberName: string
  membershipId: string
  organizationId: string
}

interface MemberDeleteButtonProps extends BaseMemberDeleteActionProps {
  redirectTo?: string
}

interface MemberDeleteMenuItemProps extends BaseMemberDeleteActionProps {
  redirectTo?: string
}

function getDeleteConfirmation(memberName: string) {
  return `Delete ${memberName} from this gym?`
}

function useDeleteMember({
  memberId,
  membershipId,
  organizationId,
  redirectTo,
}: BaseMemberDeleteActionProps & { redirectTo?: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteMemberAction({
        memberId,
        membershipId,
        organizationId,
      })

      if (result.status === "error") {
        toast.error(result.message)
        return
      }

      setIsOpen(false)
      toast.success(result.message)

      if (redirectTo) {
        router.replace(redirectTo)
        return
      }

      router.refresh()
    })
  }

  return {
    confirmDelete,
    isPending,
    isOpen,
    setIsOpen,
  }
}

export function MemberDeleteButton({
  memberId,
  memberName,
  membershipId,
  organizationId,
  redirectTo,
}: MemberDeleteButtonProps) {
  const { confirmDelete, isPending, isOpen, setIsOpen } = useDeleteMember({
    memberId,
    memberName,
    membershipId,
    organizationId,
    redirectTo,
  })

  return (
    <>
      <Button
        className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
        disabled={isPending}
        onClick={() => setIsOpen(true)}
        type="button"
        variant="outline"
      >
        <Trash2 className="size-4" />
        {isPending ? "Removing..." : "Remove Member"}
      </Button>

      <DeleteMemberDialog
        isOpen={isOpen}
        isPending={isPending}
        memberName={memberName}
        onConfirm={confirmDelete}
        onOpenChange={setIsOpen}
      />
    </>
  )
}

export function MemberDeleteMenuItem({
  memberId,
  memberName,
  membershipId,
  organizationId,
  redirectTo,
}: MemberDeleteMenuItemProps) {
  const { confirmDelete, isPending, isOpen, setIsOpen } = useDeleteMember({
    memberId,
    memberName,
    membershipId,
    organizationId,
    redirectTo,
  })

  return (
    <>
      <DropdownMenuItem
        className="text-primary focus:bg-primary/10 focus:text-primary"
        disabled={isPending}
        onSelect={(event) => {
          event.preventDefault()
          setIsOpen(true)
        }}
      >
        <Trash2 className="size-4" />
        Remove Member
      </DropdownMenuItem>

      <DeleteMemberDialog
        isOpen={isOpen}
        isPending={isPending}
        memberName={memberName}
        onConfirm={confirmDelete}
        onOpenChange={setIsOpen}
      />
    </>
  )
}

function DeleteMemberDialog({
  isOpen,
  isPending,
  memberName,
  onConfirm,
  onOpenChange,
}: {
  isOpen: boolean
  isPending: boolean
  memberName: string
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={isOpen}>
      <DialogContent className="w-[min(calc(100vw-2rem),32rem)]" showCloseButton={false}>
        <DialogHeader className="gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CircleAlert className="size-5" />
          </div>
          <DialogTitle>Remove member</DialogTitle>
          <DialogDescription>
            {getDeleteConfirmation(memberName)} This action removes the member from the
            active gym. If they are not attached to any other gym, their person record
            will also be deleted.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            className="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground shadow-[0_18px_36px_-24px_rgba(255,107,44,0.7)] hover:bg-primary/90"
            disabled={isPending}
            onClick={onConfirm}
            type="button"
          >
            <Trash2 className="size-4" />
            {isPending ? "Removing..." : "Yes, remove member"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
