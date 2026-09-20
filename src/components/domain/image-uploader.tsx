"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/client/compress-image";

async function uploadFile(file: File): Promise<string> {
  const optimized = await compressImage(file);
  const blob = await upload(optimized.name, optimized, {
    access: "public",
    handleUploadUrl: "/api/upload",
    clientPayload: "image",
  });
  return blob.url;
}

export function ImageUploader({
  value,
  onChange,
  max = 6,
  label = "Add photos",
  compact = false,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  label?: string;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const reorderable = max > 1;

  function moveTo(from: number, to: number) {
    if (from === to) return;
    const next = [...value];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - value.length;
    const list = Array.from(files).slice(0, remaining);
    if (list.length === 0) {
      toast.error(`You can add up to ${max} photos.`);
      return;
    }
    setUploading(true);
    try {
      const urls = await Promise.all(list.map(uploadFile));
      onChange([...value, ...urls]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((url, index) => (
          <div
            key={url}
            draggable={reorderable}
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => reorderable && e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null) moveTo(dragIndex, index);
              setDragIndex(null);
            }}
            onDragEnd={() => setDragIndex(null)}
            className={cn(
              "relative overflow-hidden rounded-xl bg-ink-100",
              compact ? "h-16 w-16" : "h-20 w-20",
              reorderable && "cursor-move",
              dragIndex === index && "opacity-40"
            )}
          >
            <Image src={url} alt="" fill className="object-cover" />
            {reorderable && index === 0 && (
              <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">Cover</span>
            )}
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => remove(url)}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        {value.length < max && (
          <button
            type="button"
            aria-label={label}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-300 text-ink-400 hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
              compact ? "h-16 w-16" : "h-20 w-20"
            )}
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {!compact && <span className="text-[10px] font-semibold">{label}</span>}
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
