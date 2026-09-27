"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { requestVerificationEmailAction, confirmVerificationCodeAction } from "@/lib/actions/email-otp";

/** A slim, non-dismissible reminder for a signed-in account with an
 * unverified email — session.user.hasVerifiedEmail is refreshed from the DB
 * on every request (see lib/auth.config.ts), but next-auth's client session
 * doesn't refetch on its own just because an unrelated server action ran, so
 * `update()` is called right after a successful verify to make this
 * disappear immediately instead of waiting for the next natural refetch.
 * Checkout itself is the hard-ish gate (see checkoutAction); this is just
 * the visible nudge toward fixing it before that blocks anyone. */
export function EmailVerificationBanner() {
  const { data: session, update } = useSession();
  const [step, setStep] = useState<"idle" | "sent">("idle");
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);

  if (session?.user?.hasVerifiedEmail !== false) return null;

  async function sendCode() {
    setPending(true);
    const res = await requestVerificationEmailAction();
    setPending(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setStep("sent");
    toast.success("Code sent. Check your email.");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await confirmVerificationCodeAction(code);
    setPending(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Email verified!");
    setStep("idle");
    setCode("");
    await update();
  }

  return (
    <div className="border-b border-gold-200 bg-gold-100 px-4 py-2.5 text-sm text-gold-700">
      {step === "idle" ? (
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 text-center">
          <ShieldAlert size={15} className="shrink-0" />
          <span className="font-semibold">Please verify your email. It&apos;s required before you can check out.</span>
          <button type="button" onClick={sendCode} disabled={pending} className="font-bold underline underline-offset-2 disabled:opacity-50">
            {pending ? "Sending..." : "Verify now"}
          </button>
        </div>
      ) : (
        <form onSubmit={verify} className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2 text-center">
          <span className="font-semibold">Enter the code we emailed you:</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            placeholder="123456"
            autoFocus
            className="h-8 w-28 rounded-lg border border-gold-300 bg-white px-2.5 text-center text-sm text-ink-900"
          />
          <button type="submit" disabled={pending} className="font-bold underline underline-offset-2 disabled:opacity-50">
            {pending ? "Verifying..." : "Confirm"}
          </button>
          <button type="button" onClick={sendCode} disabled={pending} className="text-gold-600 underline underline-offset-2 disabled:opacity-50">
            Resend
          </button>
        </form>
      )}
    </div>
  );
}
