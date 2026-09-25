"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suspendUserAction, adminDeleteUserAction } from "@/lib/actions/admin";

export function UserModerationActions({ userId, suspended }: { userId: string; suspended: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reason, setReason] = useState("");

  return (
    <>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={suspended ? "outline" : "destructive"}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await suspendUserAction(userId, !suspended);
              if ("error" in res) {
                toast.error(res.error);
                return;
              }
              toast.success(suspended ? "User reinstated" : "User suspended");
              router.refresh();
            })
          }
        >
          {suspended ? "Reinstate" : "Suspend"}
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirmingDelete((v) => !v)}>
          Delete
        </Button>
      </div>
      {confirmingDelete && (
        <div className="w-full space-y-2 rounded-card border border-live-200 bg-live-50 p-3">
          <p className="text-xs text-ink-700">
            This permanently removes the person&apos;s name, email, phone, addresses and ID files and locks the account.
            Their past orders and reviews stay, shown as &quot;Deleted user&quot;. It can&apos;t be undone.
          </p>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required, saved to the audit log)" maxLength={1000} />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="destructive"
              disabled={pending || reason.trim().length === 0}
              onClick={() =>
                startTransition(async () => {
                  const res = await adminDeleteUserAction(userId, reason);
                  if ("error" in res) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success("Account deleted");
                  setConfirmingDelete(false);
                  setReason("");
                  router.refresh();
                })
              }
            >
              {pending ? "Deleting..." : "Delete permanently"}
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
