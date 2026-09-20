"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

/** A live message thread wants the full screen for the conversation — the
 * footer would either crowd a short thread or add pointless scroll to a long one. */
export function ConditionalFooter() {
  const pathname = usePathname();
  const isThread = /^\/messages\/[^/]+$/.test(pathname ?? "");
  if (isThread) return null;

  return (
    <div className="pb-20 md:pb-0">
      <Footer />
    </div>
  );
}
