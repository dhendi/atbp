"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldCheck, Smartphone, Mail } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkPasswordAction } from "@/lib/actions/two-factor";
import { SocialLoginButtons } from "@/components/domain/social-login-buttons";
import { PhoneAuthFlow } from "@/components/domain/phone-auth-flow";
import { EmailAuthFlow } from "@/components/domain/email-auth-flow";

type Step = "credentials" | "code" | "phone" | "email-otp";

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-card border border-ink-100 bg-white p-6 shadow-sm sm:p-7">{children}</div>
    </div>
  );
}

export function LoginForm({ googleEnabled, facebookEnabled }: { googleEnabled: boolean; facebookEnabled: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  // Only same-site relative paths: a raw ?callbackUrl=https://evil.tld (or
  // //evil.tld, or a backslash variant) would otherwise send someone off-site
  // right after they authenticate, since router.push follows whatever it's given.
  const rawCallback = params.get("callbackUrl") || "/";
  const callbackUrl =
    rawCallback.startsWith("/") && !rawCallback.startsWith("//") && !rawCallback.includes("\\") ? rawCallback : "/";
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  function onSignedIn() {
    toast.success("Welcome back!");
    router.push(callbackUrl);
    router.refresh();
  }

  async function finishSignIn(withCode?: string) {
    const res = await signIn("credentials", { email, password, code: withCode, redirect: false });
    setLoading(false);
    if (res?.error) {
      toast.error(step === "code" ? "That code didn't work." : "Invalid email or password.");
      return;
    }
    onSignedIn();
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const check = await checkPasswordAction(email, password);
    if ("error" in check) {
      setLoading(false);
      toast.error(check.error);
      return;
    }
    if (check.requires2FA) {
      setLoading(false);
      setStep("code");
      return;
    }
    await finishSignIn();
  }

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await finishSignIn(code);
  }

  if (step === "phone") {
    return (
      <AuthCard>
        <PhoneAuthFlow callbackUrl={callbackUrl} onBack={() => setStep("credentials")} onSuccess={onSignedIn} />
      </AuthCard>
    );
  }

  if (step === "email-otp") {
    return (
      <AuthCard>
        <EmailAuthFlow callbackUrl={callbackUrl} onBack={() => setStep("credentials")} onSuccess={onSignedIn} />
      </AuthCard>
    );
  }

  if (step === "code") {
    return (
      <AuthCard>
        <ShieldCheck size={22} className="mb-2 text-brand-600" />
        <h1 className="text-xl font-extrabold text-ink-900">Enter your code</h1>
        <p className="mt-1 text-sm text-ink-500">This account has two-factor authentication on. Check your authenticator app.</p>

        <form onSubmit={handleCodeSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="code">6-digit code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
              autoFocus
              required
            />
            <p className="text-xs text-ink-400">Lost your device? You can also enter one of your recovery codes here.</p>
          </div>
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
            {loading ? "Verifying..." : "Verify"}
          </Button>
          <button
            type="button"
            onClick={() => { setStep("credentials"); setCode(""); }}
            className="w-full text-center text-sm font-semibold text-ink-500 hover:text-ink-800"
          >
            Back
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <h1 className="text-xl font-extrabold text-ink-900">Log in to ATBP</h1>
      <p className="mt-1 text-sm text-ink-500">Good to see you again.</p>

      <div className="mt-6 space-y-2">
        <SocialLoginButtons callbackUrl={callbackUrl} googleEnabled={googleEnabled} facebookEnabled={facebookEnabled} />
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setStep("email-otp")}>
          <Mail size={16} /> Continue with an emailed code
        </Button>
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setStep("phone")}>
          <Smartphone size={16} /> Continue with mobile number
        </Button>
      </div>
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-ink-400">
        <div className="h-px flex-1 bg-ink-100" /> or <div className="h-px flex-1 bg-ink-100" />
      </div>

      <form onSubmit={handleCredentialsSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs font-semibold text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
        </div>
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        New to ATBP?{" "}
        <Link href="/signup" className="font-bold text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
