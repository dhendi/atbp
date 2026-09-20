"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { createCollectionAction } from "@/lib/actions/collections";

export function NewCollectionDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await createCollectionAction({ name, description, isPublic });
    setLoading(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setOpen(false);
    setName("");
    setDescription("");
    setIsPublic(false);
    router.push(`/collections/${res.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="brand">
          <Plus size={16} /> New Collection
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Collection</DialogTitle>
          <DialogDescription>A named board of products, shops, and drops: yours to keep or share.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. Christmas gift ideas" />
          </div>
          <div className="space-y-1.5">
            <Label>Description (optional)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} placeholder="What's this collection for?" />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-ink-200 p-3">
            <div>
              <p className="text-sm font-semibold text-ink-800">Public</p>
              <p className="text-xs text-ink-500">Anyone with the link can view it.</p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="brand" disabled={!name.trim() || loading} onClick={submit}>
            {loading ? "Creating…" : "Create Collection"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
