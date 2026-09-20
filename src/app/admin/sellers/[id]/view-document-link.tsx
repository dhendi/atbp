"use client";

import { FileText } from "lucide-react";
import { logDocumentViewAction } from "@/lib/actions/admin";

/** Opens a seller's ID/license document in a new tab, same as a plain link,
 * but writes an audit-log entry first — approve/reject decisions were
 * already logged, but simply opening the raw file to look at it wasn't,
 * which meant there was no way to answer "who has actually seen this
 * person's ID" after the fact. */
export function ViewDocumentLink({ sellerId, url, documentKind, label }: { sellerId: string; url: string; documentKind: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => logDocumentViewAction(sellerId, documentKind)}
      className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline"
    >
      <FileText size={12} /> {label}
    </a>
  );
}
