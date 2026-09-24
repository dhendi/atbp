"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPayoutProvider, type PayoutMethodId } from "@/lib/payouts/provider";
import { getSellerWallet } from "@/lib/services/analytics";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { INSTANT_PAYOUT_FEE } from "@/lib/fees";

const PAYOUT_METHODS: readonly string[] = ["GCASH", "MAYA", "BANK"];

export async function requestPayoutAction(amount: number, method: PayoutMethodId, destination: string, instant = false) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Not authorized." };
  // Only an approved store can withdraw. (SUSPENDED was the only status
  // blocked before, which left PENDING and CLOSED sellers able to.)
  if (seller.status !== "APPROVED") return { error: "Your seller account can't request payouts right now. Contact support for more information." };
  if (!session.user.hasVerifiedEmail) return { error: "Please verify your email before requesting a payout." };

  if (!(await checkRateLimit(`payout:${seller.id}`, 5, 60 * 60_000))) {
    return { error: "Too many payout requests. Please wait a while and try again." };
  }

  // NaN passes every `<`/`>` comparison, so it has to be rejected explicitly;
  // amounts are also limited to whole centavos so rounding can't leak value.
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) {
    return { error: "Enter a valid amount." };
  }
  if (!PAYOUT_METHODS.includes(method)) return { error: "Choose a valid payout method." };
  const cleanDestination = String(destination ?? "").trim();
  if (cleanDestination.length < 3 || cleanDestination.length > 120) return { error: "Enter a valid payout destination." };

  const feeAmount = instant ? INSTANT_PAYOUT_FEE : 0;
  if (instant && amount <= feeAmount) {
    return { error: `Amount must be more than ${INSTANT_PAYOUT_FEE} to cover the instant payout fee.` };
  }
  const netAmount = amount - feeAmount;

  // The balance check and the payout row are written under a per-seller
  // advisory lock. Two simultaneous requests used to both read the full
  // balance and both pay out; now the second waits, then sees the first
  // one's PROCESSING row counted against the balance. The row is created
  // BEFORE any money moves and settled afterwards.
  const reserved = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${seller.id}))`;
      const wallet = await getSellerWallet(seller.id);
      if (amount > wallet.availableBalance) return null;
      return tx.payout.create({
        data: { sellerId: seller.id, amount, feeAmount, instant, method, destination: cleanDestination, status: "PROCESSING" },
      });
    },
    { timeout: 15_000 }
  );
  if (!reserved) return { error: "Requested amount exceeds your available balance." };

  // `amount` is what's debited from the seller's balance either way. The fee
  // is ATBP's cut of that withdrawal, not an extra charge on top of it. Only
  // `netAmount` actually gets disbursed to the seller's account.
  let succeeded = false;
  try {
    const result = await getPayoutProvider(method).disburse(netAmount, cleanDestination);
    succeeded = result.success;
  } catch {
    succeeded = false;
  }

  const payout = await prisma.payout.update({
    where: { id: reserved.id },
    data: {
      // FAILED is not counted against the balance, so a failed disbursement
      // automatically frees the reserved amount.
      status: succeeded ? (instant ? "PAID" : "PROCESSING") : "FAILED",
      processedAt: succeeded && instant ? new Date() : null,
    },
  });

  revalidatePath("/studio/payouts");
  return { success: true, payout };
}
