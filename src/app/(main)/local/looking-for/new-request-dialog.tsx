"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PhLocationPicker } from "@/components/domain/ph-location-picker";
import { createLookingForPostAction } from "@/lib/actions/looking-for";

interface Category {
  id: string;
  name: string;
}

export function NewRequestDialog({ categories, defaultArea, loggedIn }: { categories: Category[]; defaultArea: string | null; loggedIn: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [area, setArea] = useState(defaultArea ?? "");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [loading, setLoading] = useState(false);

  function openDialog() {
    if (!loggedIn) {
      router.push("/login?callbackUrl=/local/looking-for");
      return;
    }
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await createLookingForPostAction({
      title,
      description,
      categoryId: categoryId || undefined,
      area: area || undefined,
      budgetMin: budgetMin ? Number(budgetMin) : undefined,
      budgetMax: budgetMax ? Number(budgetMax) : undefined,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success("Request posted");
    setOpen(false);
    setTitle("");
    setDescription("");
    setBudgetMin("");
    setBudgetMax("");
    router.refresh();
  }

  return (
    <>
      <Button type="button" variant="brand" onClick={openDialog}>
        <Plus size={15} /> Post a request
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What are you looking for?</DialogTitle>
            <DialogDescription>Sellers near you (and beyond) can reply if they have or can make a match.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Vintage Nikon film camera" required maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>Details</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Condition, color, size: anything that helps a seller match you" required maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label>Category (optional)</Label>
              <Select value={categoryId || "any"} onValueChange={(v) => setCategoryId(v === "any" ? "" : v)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any category</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Area (optional)</Label>
                {area && (
                  <button type="button" onClick={() => setArea("")} className="text-xs font-semibold text-brand-600 hover:underline">
                    Anywhere
                  </button>
                )}
              </div>
              <PhLocationPicker value={area || null} onChange={setArea} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Min budget (₱, optional)</Label>
                <Input type="number" min={0} value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Max budget (₱, optional)</Label>
                <Input type="number" min={0} value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} />
              </div>
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={loading}>
              {loading ? "Posting..." : "Post Request"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
