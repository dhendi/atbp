"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Upload, X, Loader2, FileIcon } from "lucide-react";
import { toast } from "sonner";

async function uploadFile(file: File): Promise<string> {
  const blob = await upload(file.name, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    clientPayload: "digital-file",
  });
  return blob.url;
}

function fileNameFromUrl(url: string): string {
  try {
    const withoutQuery = url.split("?")[0];
    const last = withoutQuery.split("/").pop() ?? url;
    // Vercel Blob adds a random suffix before the extension (addRandomSuffix) — strip it back off for display.
    return decodeURIComponent(last).replace(/-[a-zA-Z0-9]{20,}(\.[a-zA-Z0-9]+)$/, "$1");
  } catch {
    return url;
  }
}

/** Generic file uploader (any type — STL, PDF, ZIP, audio, video, etc.) for
 * Digital Product deliverables and Service deliveries — see the
 * "digital-file" upload kind in api/upload/route.ts. Mirrors ImageUploader's
 * shape but shows filename chips instead of image previews. */
export function FileUploader({
  value, onChange, max = 5, label = "Add files",
}: { value: string[]; onChange: (urls: string[]) => void; max?: number; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = max - value.length;
    const list = Array.from(files).slice(0, remaining);
    if (list.length === 0) {
      toast.error(`You can add up to ${max} files.`);
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
      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map((url) => (
            <div key={url} className="flex items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2">
              <FileIcon size={14} className="shrink-0 text-ink-400" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink-700">{fileNameFromUrl(url)}</span>
              <button
                type="button"
                aria-label="Remove file"
                onClick={() => remove(url)}
                className="shrink-0 rounded-full p-1 text-ink-400 hover:bg-ink-200 hover:text-ink-700"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {value.length < max && (
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-300 px-3 py-3 text-sm font-semibold text-ink-400 hover:border-brand-400 hover:text-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {label}
        </button>
      )}
      <input ref={inputRef} type="file" multiple={max > 1} className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  );
}
