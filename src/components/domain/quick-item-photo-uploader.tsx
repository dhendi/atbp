"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { compressImage } from "@/lib/client/compress-image";

async function uploadFile(file: File): Promise<string> {
  const optimized = await compressImage(file);
  const blob = await upload(optimized.name, optimized, { access: "public", handleUploadUrl: "/api/upload", clientPayload: "image" });
  return blob.url;
}

const SLOTS = [
  { key: "front", label: "Front" },
  { key: "back", label: "Back" },
  { key: "tag", label: "Tag / label" },
  { key: "flaws", label: "Any flaws" },
] as const;

/** The Closet/Yard Sale quick-list photo step — four labeled prompts instead
 * of a generic multi-uploader, per the "make this as fast as possible" brief.
 * Not all four are required; `value` is the resulting URL list with empty
 * slots skipped, in the same front/back/tag/flaws order. */
export function QuickItemPhotoUploader({ value, onChange }: { value: string[]; onChange: (urls: string[]) => void }) {
  const [slotUrls, setSlotUrls] = useState<Record<string, string | null>>({ front: null, back: null, tag: null, flaws: null });
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function emit(next: Record<string, string | null>) {
    onChange(SLOTS.map((s) => next[s.key]).filter((url): url is string => !!url));
  }

  async function handlePick(slotKey: string, file: File | undefined) {
    if (!file) return;
    setUploadingSlot(slotKey);
    try {
      const url = await uploadFile(file);
      const next = { ...slotUrls, [slotKey]: url };
      setSlotUrls(next);
      emit(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploadingSlot(null);
    }
  }

  function remove(slotKey: string) {
    const next = { ...slotUrls, [slotKey]: null };
    setSlotUrls(next);
    emit(next);
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {SLOTS.map((slot) => {
        const url = slotUrls[slot.key];
        const uploading = uploadingSlot === slot.key;
        return (
          <div key={slot.key} className="space-y-1">
            <div className="relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-ink-300 bg-ink-50">
              {url ? (
                <>
                  <Image src={url} alt={slot.label} fill className="object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove ${slot.label} photo`}
                    onClick={() => remove(slot.key)}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <X size={11} />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRefs.current[slot.key]?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1 text-ink-400 hover:text-brand-500"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                </button>
              )}
            </div>
            <p className="text-center text-[10px] font-semibold text-ink-500">{slot.label}</p>
            <input
              ref={(el) => { inputRefs.current[slot.key] = el; }}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={(e) => handlePick(slot.key, e.target.files?.[0])}
            />
          </div>
        );
      })}
      {value.length === 0 && <p className="col-span-2 text-xs text-ink-400 sm:col-span-4">Add at least one photo. Front is usually enough to start.</p>}
    </div>
  );
}
