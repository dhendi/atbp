"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { IdDocumentUploader, SingleDocumentUploader } from "@/components/domain/id-document-uploader";
import { resubmitIdDocumentAction } from "@/lib/actions/seller-account";
import { idDocumentTypeLabel } from "@/lib/constants";

export function IdVerificationPanel({
  idVerified, idDocumentType, idRejectedReason, needsBusinessLicense,
}: {
  idVerified: boolean;
  idDocumentType: string | null;
  idRejectedReason: string | null;
  needsBusinessLicense: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [resubmitting, setResubmitting] = useState(false);
  const [idDocType, setIdDocType] = useState("");
  const [idDocUrl, setIdDocUrl] = useState("");
  const [licenseUrl, setLicenseUrl] = useState("");

  if (idVerified) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-live-200 bg-live-50 p-4">
        <ShieldCheck size={18} className="shrink-0 text-live-600" />
        <div>
          <p className="text-sm font-bold text-ink-900">Identity verified</p>
          <p className="text-xs text-ink-500">{idDocumentType ? idDocumentTypeLabel(idDocumentType) : "Government ID"} on file, confirmed by ATBP.</p>
        </div>
      </div>
    );
  }

  function submitResubmit() {
    if (!idDocType || !idDocUrl) return toast.error("Upload your ID before submitting.");
    if (needsBusinessLicense && !licenseUrl) return toast.error("Upload your BIR Certificate of Registration before submitting.");
    startTransition(async () => {
      const res = await resubmitIdDocumentAction({ idDocumentType: idDocType, idDocumentUrl: idDocUrl, businessLicenseUrl: licenseUrl || undefined });
      if ("error" in res) { toast.error(res.error); return; }
      toast.success("Sent for review");
      setResubmitting(false);
      router.refresh();
    });
  }

  if (idRejectedReason) {
    return (
      <div className="rounded-2xl border border-live-300 bg-live-50 p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-live-600" />
          <div>
            <p className="text-sm font-bold text-live-700">Your ID needs changes</p>
            <p className="mt-0.5 text-xs text-live-700">{idRejectedReason}</p>
            <p className="mt-1 text-xs text-ink-500">New listings are paused until this is resolved.</p>
          </div>
        </div>
        {!resubmitting ? (
          <Button className="mt-3" size="sm" variant="brand" onClick={() => setResubmitting(true)}>Resubmit ID</Button>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl border border-ink-200 bg-white p-3">
            <div className="space-y-1.5">
              <Label>New ID</Label>
              <IdDocumentUploader documentType={idDocType} onDocumentTypeChange={setIdDocType} url={idDocUrl} onUrlChange={setIdDocUrl} />
            </div>
            {needsBusinessLicense && (
              <div className="space-y-1.5">
                <Label>New BIR Certificate of Registration</Label>
                <SingleDocumentUploader url={licenseUrl} onUrlChange={setLicenseUrl} label="Upload COR document" />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="brand" disabled={pending} onClick={submitResubmit}>{pending ? "Submitting..." : "Submit for review"}</Button>
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => setResubmitting(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-gold-300 bg-gold-100 p-4">
      <Clock size={18} className="shrink-0 text-gold-600" />
      <div>
        <p className="text-sm font-bold text-ink-900">Identity verification pending</p>
        <p className="text-xs text-ink-600">{idDocumentType ? idDocumentTypeLabel(idDocumentType) : "Your ID"} is under review. You can keep listing in the meantime.</p>
      </div>
    </div>
  );
}
