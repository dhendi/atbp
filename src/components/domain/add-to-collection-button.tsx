"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { FolderPlus, Check, Plus, Lock, Globe } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { getMyCollectionsForItemAction, createCollectionAction, toggleCollectionItemAction, type CollectionItemRef } from "@/lib/actions/collections";

interface CollectionRow {
  id: string;
  name: string;
  isPublic: boolean;
  hasItem: boolean;
}

/** "Add to Collection" — a picker of the user's own boards, with a quick
 * inline "new collection" affordance, reusable on any product/seller/drop. */
export function AddToCollectionButton({
  item,
  label = "Save to Collection",
  iconOnly = false,
  className,
}: {
  item: CollectionItemRef;
  label?: string;
  iconOnly?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState<CollectionRow[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  async function load() {
    setLoading(true);
    const res = await getMyCollectionsForItemAction(item);
    setLoading(false);
    if ("error" in res) {
      if (res.error === "Please log in first.") {
        setOpen(false);
        router.push(`/login?callbackUrl=${encodeURIComponent(pathname ?? "/")}`);
        return;
      }
      toast.error(res.error);
      return;
    }
    setCollections(res.collections);
  }

  async function toggle(collectionId: string, currentlyIn: boolean) {
    setCollections((prev) => prev && prev.map((c) => (c.id === collectionId ? { ...c, hasItem: !currentlyIn } : c)));
    const res = await toggleCollectionItemAction(collectionId, item, !currentlyIn);
    if ("error" in res) {
      toast.error(res.error);
      setCollections((prev) => prev && prev.map((c) => (c.id === collectionId ? { ...c, hasItem: currentlyIn } : c)));
    }
  }

  async function createAndAdd() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await createCollectionAction({ name: newName });
    if ("error" in res) {
      toast.error(res.error);
      setCreating(false);
      return;
    }
    await toggleCollectionItemAction(res.id, item, true);
    setCollections((prev) => [{ id: res.id, name: newName.trim().slice(0, 60), isPublic: false, hasItem: true }, ...(prev ?? [])]);
    setNewName("");
    setCreating(false);
    toast.success("Added to a new collection");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v && collections === null) load();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className={className} aria-label={iconOnly ? label : undefined}>
          <FolderPlus size={16} /> {!iconOnly && label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save to Collection</DialogTitle>
          <DialogDescription>Add this to one of your boards, or start a new one.</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input placeholder="New collection name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={60} />
          <Button variant="brand" disabled={!newName.trim() || creating} onClick={createAndAdd}>
            <Plus size={15} /> Create
          </Button>
        </div>

        <div className="mt-3 max-h-64 space-y-1 overflow-y-auto">
          {loading && <p className="py-4 text-center text-sm text-ink-400">Loading your collections…</p>}
          {!loading && collections && collections.length === 0 && (
            <p className="py-2 text-center text-sm text-ink-400">No collections yet. Create one above.</p>
          )}
          {!loading &&
            collections?.map((c) => (
              <button
                key={c.id}
                onClick={() => toggle(c.id, c.hasItem)}
                className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-sm hover:bg-ink-50"
              >
                <span className="flex items-center gap-1.5 text-ink-800">
                  {c.isPublic ? <Globe size={13} className="text-ink-400" /> : <Lock size={13} className="text-ink-400" />}
                  {c.name}
                </span>
                <span className={`flex h-5 w-5 items-center justify-center rounded-md border ${c.hasItem ? "border-brand-500 bg-brand-500 text-white" : "border-ink-300"}`}>
                  {c.hasItem && <Check size={13} />}
                </span>
              </button>
            ))}
        </div>

        <Link href="/collections" className="mt-3 block text-center text-xs font-semibold text-brand-600 hover:underline">
          Manage all collections
        </Link>
      </DialogContent>
    </Dialog>
  );
}
