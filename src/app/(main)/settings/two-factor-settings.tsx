"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldOff, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getTwoFactorStatusAction,
  beginTwoFactorSetupAction,
  confirmTwoFactorSetupAction,
  disableTwoFactorAction,
} from "@/lib/actions/two-factor";

type Stage = "loading" | "off" | "enrolling" | "on" | "showingRecoveryCodes";

export function TwoFactorSettings() {
  const [stage, setStage] = useState<Stage>("loading");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getTwoFactorStatusAction().then((res) => {
      if ("error" in res) return;
      setStage(res.enabled ? "on" : "off");
    });
  }, []);

  async function startEnrollment() {
    setBusy(true);
    const res = await beginTwoFactorSetupAction();
    setBusy(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setSecret(res.secret);
    setStage("enrolling");
  }

  async function confirmEnrollment(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await confirmTwoFactorSetupAction(code);
    setBusy(false);
    if ("error" in res) {
      toast.error(res.error);
      return;
    }
    setRecoveryCodes(res.recoveryCodes);
    setCode("");
    setStage("showingRecoveryCodes");
  }

  async function disable() {
    if (!confirm("Turn off two-factor authentication for your admin account?")) return;
    setBusy(true);
    const res = await disableTwoFactorAction();
    setBusy(false);
    if (res && "error" in res) {
      toast.error(res.error);
      return;
    }
    toast.success("Two-factor authentication turned off");
    setStage("off");
  }

  function copySecret() {
    navigator.clipboard.writeText(secret);
    toast.success("Copied");
  }

  if (stage === "loading") return null;

  if (stage === "off") {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-card border border-ink-100 bg-white p-4">
        <ShieldOff size={20} className="shrink-0 text-ink-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">Two-factor authentication is off</p>
          <p className="text-xs text-ink-500">Add a code from an authenticator app to every login.</p>
        </div>
        <Button size="sm" variant="brand" onClick={startEnrollment} disabled={busy}>
          Enable
        </Button>
      </div>
    );
  }

  if (stage === "on") {
    return (
      <div className="mt-4 flex items-center gap-3 rounded-card border border-ink-100 bg-white p-4">
        <ShieldCheck size={20} className="shrink-0 text-live-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-ink-900">Two-factor authentication is on</p>
          <p className="text-xs text-ink-500">You'll need a code from your authenticator app to log in.</p>
        </div>
        <Button size="sm" variant="outline" onClick={disable} disabled={busy}>
          Disable
        </Button>
      </div>
    );
  }

  if (stage === "enrolling") {
    return (
      <div className="mt-4 space-y-4 rounded-card border border-ink-100 bg-white p-4">
        <div>
          <p className="mb-1.5 text-sm font-bold text-ink-900">1. Add this key to your authenticator app</p>
          <p className="mb-2 text-xs text-ink-500">
            Google Authenticator, Authy, 1Password, etc. Choose "enter a setup key manually" and paste this in.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-xl bg-ink-50 px-3 py-2 text-sm font-bold tracking-wide text-ink-800">{secret}</code>
            <Button type="button" size="icon" variant="outline" onClick={copySecret}>
              <Copy size={14} />
            </Button>
          </div>
        </div>
        <form onSubmit={confirmEnrollment} className="space-y-1.5">
          <Label htmlFor="setup-code">2. Enter the 6-digit code it shows</Label>
          <Input id="setup-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoFocus required />
          <Button type="submit" variant="brand" className="mt-2 w-full" disabled={busy}>
            {busy ? "Verifying..." : "Confirm"}
          </Button>
        </form>
      </div>
    );
  }

  // showingRecoveryCodes
  return (
    <div className="mt-4 space-y-3 rounded-card border border-gold-400 bg-gold-100 p-4">
      <div className="flex items-center gap-2">
        <CheckCircle2 size={18} className="text-live-500" />
        <p className="text-sm font-bold text-ink-900">Two-factor authentication is on</p>
      </div>
      <p className="text-xs text-ink-700">
        Save these recovery codes somewhere safe: each works once, if you ever lose access to your authenticator app. They won't be shown again.
      </p>
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-white p-3">
        {recoveryCodes.map((c) => (
          <code key={c} className="text-xs font-bold text-ink-800">{c}</code>
        ))}
      </div>
      <Button size="sm" variant="brand" onClick={() => setStage("on")}>
        Done
      </Button>
    </div>
  );
}
