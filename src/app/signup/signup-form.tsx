"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Gift, Smartphone, Mail } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction } from "@/lib/actions/auth";
import { SocialLoginButtons } from "@/components/domain/social-login-buttons";
import { PhoneAuthFlow } from "@/components/domain/phone-auth-flow";
import { EmailAuthFlow } from "@/components/domain/email-auth-flow";

function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-12">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-card border border-ink-100 bg-white p-6 shadow-sm sm:p-7">{children}</div>
    </div>
  );
}

export function SignupForm({ googleEnabled, facebookEnabled }: { googleEnabled: boolean; facebookEnabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromPromo = searchParams.get("promo") === "welcome";
  const [loading, setLoading] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(fromPromo);
  const [showPhoneFlow, setShowPhoneFlow] = useState(false);
  const [showEmailOtpFlow, setShowEmailOtpFlow] = useState(false);

  function onSignedUp() {
    toast.success("Welcome to ATBP!");
    router.push("/");
    router.refresh();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await signupAction(null, formData);
    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }
    const res = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      toast.error("Account created, but auto-login failed. Please log in.");
      router.push("/login");
      return;
    }
    if (result.couponCode) {
      toast.success("🎉 Your ₱100 off is ready! Check My Coupons anytime.");
      router.push("/");
      router.refresh();
      return;
    }
    onSignedUp();
  }

  if (showPhoneFlow) {
    return (
      <AuthCard>
        <PhoneAuthFlow callbackUrl="/" onBack={() => setShowPhoneFlow(false)} onSuccess={onSignedUp} />
      </AuthCard>
    );
  }

  if (showEmailOtpFlow) {
    return (
      <AuthCard>
        <EmailAuthFlow callbackUrl="/" onBack={() => setShowEmailOtpFlow(false)} onSuccess={onSignedUp} />
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      {fromPromo && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-gold-100 p-3.5">
          <Gift size={18} className="mt-0.5 shrink-0 text-gold-600" />
          <p className="text-xs font-semibold leading-relaxed text-ink-800">
            Sign up and join our mailing list to unlock 10% off your first purchase, up to ₱100.
          </p>
        </div>
      )}
      <h1 className="text-xl font-extrabold text-ink-900">Create your account</h1>
      <p className="mt-1 text-sm text-ink-500">Join the home for Filipino makers, collectors, and buyers.</p>

      <div className="mt-6 space-y-2">
        <SocialLoginButtons googleEnabled={googleEnabled} facebookEnabled={facebookEnabled} />
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setShowEmailOtpFlow(true)}>
          <Mail size={16} /> Continue with an emailed code
        </Button>
        <Button type="button" variant="outline" size="lg" className="w-full" onClick={() => setShowPhoneFlow(true)}>
          <Smartphone size={16} /> Continue with mobile number
        </Button>
      </div>
      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase text-ink-400">
        <div className="h-px flex-1 bg-ink-100" /> or <div className="h-px flex-1 bg-ink-100" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" placeholder="Maria Santos" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" name="username" placeholder="mariasantos" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="you@email.com" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" placeholder="At least 6 characters" required />
        </div>
        <label className="flex items-start gap-2.5 rounded-xl border border-ink-100 bg-ink-50 p-3 text-xs text-ink-700">
          <input
            type="checkbox"
            name="marketingOptIn"
            checked={marketingOptIn}
            onChange={(e) => setMarketingOptIn(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-brand-500"
          />
          <span>
            Subscribe to ATBP marketing emails.{" "}
            <span className="text-ink-500">Required to unlock 10% off your first purchase (up to ₱100) — no spam, unsubscribe anytime.</span>
          </span>
        </label>
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </Button>
        <p className="text-center text-[11px] text-ink-400">
          By signing up, you agree to ATBP&apos;s{" "}
          <Link href="/terms" className="font-semibold text-ink-600 hover:underline">Terms of Service</Link> and{" "}
          <Link href="/privacy" className="font-semibold text-ink-600 hover:underline">Privacy Policy</Link>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-ink-500">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
