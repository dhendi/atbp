"use client";

import { useState } from "react";
import { Share2, Link2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

// Facebook's sharer and WhatsApp's wa.me are the two share targets that work
// with just a URL — no app registration needed. Messenger and Instagram don't
// have an equivalent no-auth web share endpoint, so rather than link to
// something broken, those are only reachable through the OS share sheet
// (`navigator.share`) below, same as any other app the visitor has installed.
function facebookShareUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}
function whatsappShareUrl(url: string, text: string) {
  return `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
}

export function ShareButton({
  url, title, variant = "outline", size = "default", iconOnly = false,
}: {
  url: string;
  title: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link. Copy it from the address bar instead.");
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // User cancelled the share sheet — not an error worth surfacing.
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size={iconOnly ? "icon" : size} aria-label="Share">
          <Share2 size={16} /> {!iconOnly && "Share"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={copyLink}>
          {copied ? <Check size={15} className="text-live-600" /> : <Link2 size={15} />} Copy Link
        </DropdownMenuItem>
        {canNativeShare && (
          <DropdownMenuItem onSelect={nativeShare}>
            <Share2 size={15} /> Share via…
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <a href={facebookShareUrl(url)} target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={whatsappShareUrl(url, title)} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
