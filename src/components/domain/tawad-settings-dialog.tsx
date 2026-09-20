"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { setTawadSettingsAction } from "@/lib/actions/tawad";

export function TawadSettingsDialog({
  productId, tawadEnabled, tawadFloor, tawadCeiling,
}: { productId: string; tawadEnabled: boolean; tawadFloor: number | null; tawadCeiling: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(tawadEnabled);
  const [floor, setFloor] = useState(tawadFloor?.toString() ?? "");
  const [ceiling, setCeiling] = useState(tawadCeiling?.toString() ?? "");
  const [loading, setLoading] = useState(false);

  async function save() {
    setLoading(true);
    const res = await setTawadSettingsAction(productId, {
      enabled,
      floor: floor ? Number(floor) : undefined,
      ceiling: ceiling ? Number(ceiling) : undefined,
    });
    setLoading(false);
    if ("error" in res) return toast.error(res.error);
    toast.success(enabled ? "Tawad is on for this item" : "Tawad turned off");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={tawadEnabled ? "brand" : "outline"}>
          <Handshake size={13} /> {tawadEnabled ? "Tawad on" : "Tawad"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tawad settings</DialogTitle>
          <DialogDescription>Let buyers make an offer (Tawad) on this item.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-sm font-semibold text-ink-800">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-brand-500" />
            Offers welcome (Tawad)
          </label>
          {enabled && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="tawad-floor">Lowest offer you&apos;d accept (₱)</Label>
                <Input id="tawad-floor" type="number" min={1} value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="e.g. 300" />
                <p className="text-xs text-ink-400">Never shown to buyers. Offers below this are declined automatically.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tawad-ceiling">Auto-accept at or above (₱), optional</Label>
                <Input id="tawad-ceiling" type="number" min={1} value={ceiling} onChange={(e) => setCeiling(e.target.value)} placeholder="Leave blank to review every offer yourself" />
              </div>
            </>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="brand" disabled={loading} onClick={save}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
