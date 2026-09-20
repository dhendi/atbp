"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { updateCollectionAction, deleteCollectionAction } from "@/lib/actions/collections";

export function CollectionHeaderActions({
  collection,
}: {
  collection: { id: string; name: string; description: string | null; isPublic: boolean };
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(collection.name);
  const [description, setDescription] = useState(collection.description ?? "");
  const [isPublic, setIsPublic] = useState(collection.isPublic);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveEdit() {
    setSaving(true);
    const res = await updateCollectionAction(collection.id, { name, description, isPublic });
    setSaving(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setEditOpen(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Delete "${collection.name}"? This can't be undone.`)) return;
    setDeleting(true);
    const res = await deleteCollectionAction(collection.id);
    setDeleting(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    router.push("/collections");
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copied");
  }

  return (
    <div className="flex items-center gap-1.5">
      {collection.isPublic && (
        <Button variant="outline" size="sm" onClick={copyLink}>
          <LinkIcon size={14} /> Share
        </Button>
      )}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Pencil size={14} /> Edit
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Collection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
              <div>
                <p className="text-sm font-semibold text-ink-800">Public</p>
                <p className="text-xs text-ink-500">Anyone with the link can view it.</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
          <div className="mt-5 flex justify-between gap-2">
            <Button variant="destructive" disabled={deleting} onClick={remove}>
              <Trash2 size={14} /> Delete
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
              </DialogClose>
              <Button variant="brand" disabled={!name.trim() || saving} onClick={saveEdit}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
