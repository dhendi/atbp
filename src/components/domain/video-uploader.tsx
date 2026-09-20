"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Video, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function VideoUploader({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: "video",
      });
      onChange(blob.url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (value) {
    return (
      <div className="relative w-full max-w-xs overflow-hidden rounded-xl bg-ink-100">
        <video src={value} controls className="aspect-video w-full object-cover" />
        <button
          type="button"
          aria-label="Remove video"
          onClick={() => onChange(null)}
          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={13} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex h-20 w-full max-w-xs flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink-300 text-ink-400 hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Video size={16} />}
        <span className="text-[10px] font-semibold">{uploading ? "Uploading..." : "Add video"}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(e) => handleFile(e.target.files)}
      />
    </div>
  );
}
