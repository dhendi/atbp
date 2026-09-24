"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Upload, X, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ID_DOCUMENT_TYPES } from "@/lib/constants";

/** Admin-review documents (seller ID, business license) — never shown on any
 * public-facing page. Shares the same Vercel Blob client-upload pattern as
 * ImageUploader/FileUploader, but scoped to the "id-document" kind (see
 * api/upload/route.ts) and always exactly one file, since there's only ever
 * one current document of a given kind on file. */
async function uploadDocument(file: File): Promise<string> {
  const blob = await upload(`id-documents/${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    clientPayload: "id-document",
  });
  return blob.url;
}

/** The upload button + uploaded-state chip, with no document-type picker —
 * used directly for a single known document (e.g. a business license), and
 * wrapped by IdDocumentUploader below when the document type also needs
 * choosing (a personal ID). */
export function SingleDocumentUploader({
  url, onUrlChange, label = "Upload a clear photo or scan", accept = "image/jpeg,image/png,image/webp,application/pdf", capture, uploadedLabel = "Document uploaded",
}: {
  url: string;
  onUrlChange: (url: string) => void;
  label?: string;
  accept?: string;
  /** "user" opens the front/selfie camera directly on mobile instead of the file picker. Ignored on desktop. */
  capture?: "user" | "environment";
  uploadedLabel?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      onUrlChange(await uploadDocument(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      {url ? (
        <div className="flex items-center gap-2 rounded-xl border border-live-200 bg-live-50 px-3 py-2">
          <CheckCircle2 size={14} className="shrink-0 text-live-600" />
          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-live-700">{uploadedLabel}</span>
          <button
            type="button"
            aria-label="Remove document"
            onClick={() => onUrlChange("")}
            className="shrink-0 rounded-full p-1 text-live-500 hover:bg-live-100"
          >
            <X size={13} />
          </button>
        </div>
      ) : (
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
      <input ref={inputRef} type="file" accept={accept} capture={capture} className="hidden" onChange={(e) => handleFile(e.target.files)} />
      <p className="flex items-center gap-1 text-[11px] text-ink-400">
        <FileText size={11} /> Reviewed by ATBP admins only. Never shown publicly on your shop page.
      </p>
    </div>
  );
}

export function IdDocumentUploader({
  documentType, onDocumentTypeChange, url, onUrlChange, label, selfieUrl, onSelfieUrlChange,
}: {
  documentType: string;
  onDocumentTypeChange: (value: string) => void;
  url: string;
  onUrlChange: (url: string) => void;
  label?: string;
  selfieUrl: string;
  onSelfieUrlChange: (url: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Select value={documentType} onValueChange={onDocumentTypeChange}>
          <SelectTrigger><SelectValue placeholder="Choose ID type" /></SelectTrigger>
          <SelectContent>
            {ID_DOCUMENT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SingleDocumentUploader url={url} onUrlChange={onUrlChange} label={label} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-ink-600">Live selfie</p>
        <SingleDocumentUploader
          url={selfieUrl}
          onUrlChange={onSelfieUrlChange}
          label="Take a live selfie"
          accept="image/*"
          capture="user"
          uploadedLabel="Selfie captured"
        />
      </div>
    </div>
  );
}
