"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { convertGuestToAccountAction } from "@/lib/actions/guest-checkout";

export function GuestOrderSuccess({ orderNumber, trackingUrl, email }: { orderNumber: string; trackingUrl: string; email: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [converted, setConverted] = useState(false);

  async function createAccount() {
    if (!name.trim()) return toast.error("Enter your name.");
    if (password.length < 6) return toast.error("Password must be at least 6 characters.");
    setLoading(true);
    const res = await convertGuestToAccountAction(email, name, password);
    if ("error" in res) {
      setLoading(false);
      toast.error(res.error);
      return;
    }
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (signInRes?.error) {
      toast.success("Account created. Please log in.");
      router.push("/login");
      return;
    }
    toast.success("Account created! Your order is linked to it.");
    setConverted(true);
    setTimeout(() => router.push("/orders"), 1200);
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-xl font-extrabold text-ink-900">Order placed!</h1>
        <p className="text-sm text-ink-500">
          Order <strong>{orderNumber}</strong> is confirmed. We&apos;ve emailed a receipt and tracking link to <strong>{email}</strong>.
        </p>
        <Link href={trackingUrl} className="text-xs font-semibold text-brand-600 hover:underline">
          Track this order →
        </Link>
      </div>

      {converted ? (
        <p className="rounded-2xl bg-brand-50 p-4 text-sm font-semibold text-brand-700">Redirecting to your orders...</p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-ink-100 bg-white p-4 text-left">
          <p className="flex items-center gap-1.5 text-sm font-bold text-ink-900">
            <UserPlus size={15} className="text-brand-600" /> Create an account to track your orders
          </p>
          <p className="text-xs text-ink-500">Just set a password, and we&apos;ll use the name and email from this order.</p>
          <div className="space-y-1.5">
            <Label htmlFor="convert-name">Full name</Label>
            <Input id="convert-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Maria Santos" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="convert-password">Password</Label>
            <Input id="convert-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
          </div>
          <Button variant="brand" className="w-full" onClick={createAccount} disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </Button>
          <button type="button" onClick={() => router.push("/")} className="w-full text-center text-xs font-semibold text-ink-400 hover:text-ink-600">
            No thanks, continue browsing
          </button>
        </div>
      )}
    </div>
  );
}
