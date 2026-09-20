"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestEmailOtpAction } from "@/lib/actions/email-otp";

/** The email → OTP → signed-in flow, mirroring PhoneAuthFlow exactly: shared
 * between login and signup since requesting/verifying a code is identical
 * either way, and the "email-otp" Credentials provider (see lib/auth.ts)
 * transparently creates the account on first verification. Unlike phone,
 * ZeptoMail is a real, working provider, so there's no dev-mode code
 * fallback to show here. */
export function EmailAuthFlow({
  callbackUrl, onBack, onSuccess,
}: { callbackUrl: string; onBack: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendCode() {
    setLoading(true);
    const res = await requestEmailOtpAction(email);
    setLoading(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await signIn("email-otp", { email, code, callbackUrl, redirect: false });
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
        onClick={step === "email" ? onBack : () => setStep("email")}
        className="mb-3 flex items-center gap-1 text-sm font-semibold text-ink-500 hover:text-ink-800"
      >
        <ArrowLeft size={15} /> Back
      </button>
      <Mail size={22} className="mb-2 text-brand-600" />

      {step === "email" ? (
        <>
          <h1 className="text-xl font-extrabold text-ink-900">Continue with a code</h1>
          <p className="mt-1 text-sm text-ink-500">We&apos;ll email you a one-time code, no password needed.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendCode();
            }}
            className="mt-6 space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="email-otp">Email</Label>
              <Input
                id="email-otp"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
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
          <p className="mt-1 text-sm text-ink-500">We emailed a 6-digit code to {email}.</p>
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email-code">6-digit code</Label>
              <Input
                id="email-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                autoFocus
                required
              />
            </div>
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
