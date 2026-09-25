"use client";

import { useState, useTransition } from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteMyAccountAction, getMyDeletionBlockersAction } from "@/lib/actions/account-deletion";

export function DeleteAccountSection() {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [confirmText, setConfirmText] = useState("");

  function start() {
    startTransition(async () => {
      const res = await getMyDeletionBlockersAction();
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      setBlockers("blockers" in res && res.blockers ? res.blockers : []);
      setOpen(true);
    });
  }

  function confirmDelete() {
    startTransition(async () => {
      const res = await deleteMyAccountAction(confirmText);
      if ("error" in res && res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Your account has been deleted.");
      await signOut({ callbackUrl: "/" });
    });
  }

  return (
    <div className="mt-8 border-t border-ink-100 pt-8">
      <h2 className="font-display text-lg font-semibold text-ink-900">Delete account</h2>
      <p className="mt-1 text-sm text-ink-500">
        Permanently removes your name, email, phone number, addresses and any ID files, and signs you out everywhere.
        Records of past orders are kept, shown without your name. This can&apos;t be undone.
      </p>

      {!open ? (
        <Button variant="outline" size="sm" className="mt-4" disabled={pending} onClick={start}>
          Delete my account
        </Button>
      ) : blockers.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-live-300 bg-live-50 p-4">
          <p className="text-sm font-bold text-live-700">You can&apos;t delete your account yet</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-live-700">
            {blockers.map((b) => <li key={b}>{b}</li>)}
          </ul>
          <p className="mt-2 text-xs text-ink-600">Sort these out, then come back and try again.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setOpen(false)}>Close</Button>
        </div>
      ) : (
        <div className="mt-4 space-y-3 rounded-2xl border border-live-300 bg-live-50 p-4">
          <p className="text-sm text-ink-800">Type <span className="font-bold">DELETE</span> to confirm.</p>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" autoComplete="off" />
          <div className="flex gap-2">
            <Button variant="destructive" size="sm" disabled={pending || confirmText.trim() !== "DELETE"} onClick={confirmDelete}>
              {pending ? "Deleting..." : "Delete permanently"}
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => { setOpen(false); setConfirmText(""); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
