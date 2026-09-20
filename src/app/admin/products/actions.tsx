"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { OctagonAlert, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { moderateProductAction, flagProhibitedItemAction, adminUpdateProductAction } from "@/lib/actions/admin";

export function ProductModerationActions({
  productId, status, title, description, price,
}: { productId: string; status: string; title: string; description: string; price: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flagOpen, setFlagOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title, description, price: String(price), reason: "" });

  function apply(newStatus: "ACTIVE" | "FLAGGED" | "REMOVED") {
    startTransition(async () => {
      const res = await moderateProductAction(productId, newStatus);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Product ${newStatus.toLowerCase()}`);
      router.refresh();
    });
  }

  function submitFlag() {
    if (!reason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    startTransition(async () => {
      const res = await flagProhibitedItemAction(productId, reason.trim());
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Listing removed and warning issued");
      setFlagOpen(false);
      setReason("");
      router.refresh();
    });
  }

  function submitEdit() {
    if (!editForm.reason.trim()) {
      toast.error("A reason is required.");
      return;
    }
    const priceNum = Number(editForm.price);
    if (!priceNum || priceNum <= 0) {
      toast.error("Enter a valid price.");
      return;
    }
    startTransition(async () => {
      const res = await adminUpdateProductAction(
        productId,
        { title: editForm.title, description: editForm.description, price: priceNum },
        editForm.reason.trim()
      );
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Listing updated");
      setEditOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-1.5">
      {status !== "ACTIVE" && <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("ACTIVE")}>Approve</Button>}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditOpen(true)}>
          <Pencil size={13} /> Edit
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
            <DialogDescription>The seller is notified that ATBP edited their listing, with your reason.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2.5">
            <div className="space-y-1">
              <Label className="text-xs">Title</Label>
              <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price (₱)</Label>
              <Input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reason (sent to seller)</Label>
              <Input value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} placeholder="e.g. Fixed a typo in the title" />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="brand" size="sm" disabled={pending} onClick={submitEdit}>
              {pending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {status !== "FLAGGED" && <Button size="sm" variant="outline" disabled={pending} onClick={() => apply("FLAGGED")}>Flag</Button>}
      {status !== "REMOVED" && <Button size="sm" variant="destructive" disabled={pending} onClick={() => apply("REMOVED")}>Remove</Button>}

      <Dialog open={flagOpen} onOpenChange={setFlagOpen}>
        <Button size="sm" variant="destructive" disabled={pending} onClick={() => setFlagOpen(true)}>
          <OctagonAlert size={14} /> Prohibited item
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flag as prohibited item</DialogTitle>
            <DialogDescription>
              This removes the listing immediately and logs a warning against the seller&apos;s account. 3 active
              warnings auto-suspends the account pending review.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Counterfeit goods that imitate a registered trademark"
              autoFocus
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline" size="sm">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" size="sm" disabled={pending} onClick={submitFlag}>
              {pending ? "Submitting..." : "Remove & warn seller"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
