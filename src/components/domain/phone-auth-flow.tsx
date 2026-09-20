"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Smartphone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPhoneOtpAction } from "@/lib/actions/phone-auth";

/** The phone number → OTP → signed-in flow, shared between login and signup
 * since they're identical: requesting/verifying a code is the same call
 * either way, and the "phone-otp" Credentials provider (see lib/auth.ts)
 * transparently creates the account on first verification rather than
 * needing a separate register step. */
export function PhoneAuthFlow({
  callbackUrl, onBack, onSuccess,
}: { callbackUrl: string; onBack: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    const res = await requestPhoneOtpAction(phone);
    setLoading(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setDevCode(res.devCode ?? null);
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("phone-otp", { phone, code, callbackUrl, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error("That code didn't work.");
      return;
    }
    onSuccess();
  }

  return (
    <>
      <button
        type="button"
        onClick={step === "phone" ? onBack : () => setStep("phone")}
        className="mb-3 flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <Smartphone size={22} className="mb-2 text-brand-600" />

      {step === "phone" ? (
        <>
          <h1 className="text-xl font-extrabold text-ink-900">Continue with your mobile number</h1>
          <p className="mt-1 text-sm text-ink-500">We&apos;ll text you a one-time code, no password needed.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917 123 4567"
                autoFocus
                required
              />
            </div>
            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
              {loading ? "Sending code..." : "Send code"}
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-xl font-extrabold text-ink-900">Enter the code</h1>
          <p className="mt-1 text-sm text-ink-500">We texted a 6-digit code to {phone}.</p>
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone-code">6-digit code</Label>
              <Input
                id="phone-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                autoFocus
                required
              />
            </div>
            {devCode && (
              <div className="rounded-xl border border-dashed border-gold-400 bg-gold-100 p-3">
                <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-gold-600">No SMS provider connected yet</p>
                <p className="text-xs text-ink-600">
                  In production this is texted to you. For now, your code is: <span className="font-bold">{devCode}</span>
                </p>
              </div>
            )}
            <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Verify & continue"}
            </Button>
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={loading}
              className="w-full text-center text-sm font-semibold text-ink-500 hover:text-ink-800 disabled:opacity-50"
            >
              Resend code
            </button>
          </form>
        </>
      )}
    </>
  );
}
