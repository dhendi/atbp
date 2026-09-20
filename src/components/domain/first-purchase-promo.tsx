"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Gift, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/logo";
import { subscribeAndClaimCouponAction } from "@/lib/actions/coupons";

export type PromoEligibility = "anonymous" | "logged_in_unsubscribed";

const DISMISS_KEY = "atbp_promo_dismissed_until";
const SESSION_KEY = "atbp_promo_shown";
const DISMISS_DAYS = 3;
const AUTO_OPEN_DELAY_MS = 3500;

export type PromoStatus = PromoEligibility | "claimed_active" | "claimed_used" | "ineligible";

/** Popup + reopenable badge for the first-purchase mailing-list offer. The homepage always
 * renders this — eligibility is frozen from the server's initial read at mount, not tracked
 * live, so a claim action's revalidatePath (which changes the server's status on the next
 * render) can't unmount this component out from under its own success state. */
export function FirstPurchasePromo({ initialStatus }: { initialStatus: PromoStatus }) {
  const [eligibility] = useState<PromoEligibility | null>(
    initialStatus === "anonymous" || initialStatus === "logged_in_unsubscribed" ? initialStatus : null
  );
  const [open, setOpen] = useState(false);
  const [showBadge, setShowBadge] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedCode, setClaimedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!eligibility) return;
    let dismissedUntil = 0;
    let shownThisSession = false;
    try {
      dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
      shownThisSession = sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      // storage unavailable (private mode, etc.) — just show once, no persistence
    }
    if (Date.now() < dismissedUntil || shownThisSession) {
      setShowBadge(true);
      return;
    }
    const timer = setTimeout(() => {
      setOpen(true);
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
    }, AUTO_OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [eligibility]);

  function handleDismiss() {
    setOpen(false);
    setShowBadge(true);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000));
    } catch {}
  }

  function handleReopen() {
    setShowBadge(false);
    setOpen(true);
  }

  async function handleClaim() {
    setClaiming(true);
    const result = await subscribeAndClaimCouponAction();
    setClaiming(false);
    if ("error" in result) {
      toast.error(result.error);
      return;
    }
    setClaimedCode(result.coupon.code);
  }

  if (!eligibility) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : handleDismiss())}>
        <DialogContent
          hideClose
          className="max-h-[85vh] w-full max-w-full translate-x-0 translate-y-0 overflow-y-auto rounded-b-none rounded-t-3xl border-t border-ink-100 bottom-0 top-auto left-0 inset-x-0 p-0 md:inset-x-auto md:left-1/2 md:top-1/2 md:bottom-auto md:w-[92vw] md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl md:border"
        >
          {claimedCode ? (
            <SuccessCard code={claimedCode} onShopNow={handleDismiss} />
          ) : (
            <PromoCard
              eligibility={eligibility}
              claiming={claiming}
              onClaim={eligibility === "logged_in_unsubscribed" ? handleClaim : undefined}
              onDismiss={handleDismiss}
            />
          )}
        </DialogContent>
      </Dialog>

      {showBadge && (
        <button
          type="button"
          onClick={handleReopen}
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-brand-500 py-2.5 pl-3.5 pr-4 text-left shadow-lg shadow-brand-500/30 transition-transform hover:scale-[1.03] active:scale-[0.97] md:bottom-5"
        >
          <span className="text-base leading-none">🎁</span>
          <span className="leading-tight">
            <span className="block text-[11px] font-extrabold uppercase tracking-wide text-white">10% off first purchase</span>
            <span className="block text-[10px] font-semibold text-white/75">Up to ₱100, sign up to claim</span>
          </span>
        </button>
      )}
    </>
  );
}

function PromoCard({
  eligibility,
  claiming,
  onClaim,
  onDismiss,
}: {
  eligibility: PromoEligibility;
  claiming: boolean;
  onClaim?: () => void;
  onDismiss: () => void;
}) {
  return (
    <div>
      <div className="relative overflow-hidden rounded-t-3xl bg-ink-900 px-6 pb-7 pt-7 text-white">
        <div className="paper-grain absolute inset-0" />
        <LogoMark className="absolute -right-3 -top-3 h-24 w-24 opacity-[0.08]" />
        <DialogClose className="absolute right-4 top-4 rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none">
          <X size={18} />
        </DialogClose>

        <div className="relative">
          <p className="font-tag flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-300">
            <Sparkles size={12} /> Promotion
          </p>
          <p className="font-display mt-3 text-4xl font-semibold leading-none">10% OFF</p>
          <p className="font-display mt-1 text-xl font-semibold text-white/90">Your first purchase</p>
          <p className="mt-3 text-sm leading-relaxed text-white/70">
            Sign up for ATBP and join our mailing list to get 10% off your first purchase, up to ₱100.
          </p>

          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3.5 py-1.5">
            <Gift size={14} className="text-ink-900" />
            <span className="text-xs font-extrabold uppercase tracking-wide text-ink-900">Up to ₱100 off</span>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-white/50">
            Discover unique finds from independent sellers: handmade, vintage, pre-loved, collectibles, art, and more.
          </p>
        </div>
      </div>

      <div className="px-6 pb-6 pt-5">
        {eligibility === "anonymous" ? (
          <Button asChild variant="gold" size="lg" className="w-full">
            <Link href="/signup?promo=welcome">Get my ₱100 off</Link>
          </Button>
        ) : (
          <Button variant="gold" size="lg" className="w-full" onClick={onClaim} disabled={claiming}>
            {claiming ? "Claiming..." : "Get my ₱100 off"}
          </Button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="mt-3 w-full text-center text-sm font-semibold text-ink-500 hover:text-ink-800"
        >
          Maybe later
        </button>
        <p className="mt-3 text-center text-[11px] text-ink-400">No spam. Unsubscribe anytime.</p>
      </div>
    </div>
  );
}

function SuccessCard({ code, onShopNow }: { code: string; onShopNow: () => void }) {
  return (
    <div className="px-6 py-8 text-center">
      <p className="text-4xl">🎉</p>
      <h2 className="font-display mt-3 text-xl font-semibold text-ink-900">Your ₱100 off is ready!</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-500">
        You&apos;ve unlocked 10% off your first ATBP purchase, up to ₱100. It&apos;s applied automatically at checkout.
      </p>
      <div className="mt-4 rounded-2xl border border-dashed border-gold-500 bg-gold-100 px-4 py-3">
        <p className="font-tag text-sm font-bold tracking-wide text-ink-900">{code}</p>
      </div>
      <Button asChild variant="gold" size="lg" className="mt-5 w-full" onClick={onShopNow}>
        <Link href="/">Shop now</Link>
      </Button>
    </div>
  );
}
