"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordResetAction } from "@/lib/actions/password-reset";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await requestPasswordResetAction(email);
    setLoading(false);
    if ("error" in res) {
      setMessage(res.error);
      return;
    }
    setMessage(res.message);
  }

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-12">
      <Logo className="mb-8" />
      <div className="w-full max-w-sm rounded-card border border-ink-100 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-extrabold text-ink-900">Reset your password</h1>
        <p className="mt-1 text-sm text-ink-500">Enter your email and we&apos;ll send you a reset link.</p>

        {message ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-ink-50 p-5 text-center">
            <CheckCircle2 size={24} className="text-live-500" />
            <p className="text-sm text-ink-700">{message}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required />
            </div>
            <Button type="submit" variant="brand" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send reset link"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-ink-500">
          <Link href="/login" className="font-bold text-brand-600 hover:underline">
            Back to log in
          </Link>
        </p>
      </div>
    </div>
  );
}
