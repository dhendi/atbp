"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPayoutProvider, type PayoutMethodId } from "@/lib/payouts/provider";
import { getSellerWallet } from "@/lib/services/analytics";
import { INSTANT_PAYOUT_FEE } from "@/lib/fees";

export async function requestPayoutAction(amount: number, method: PayoutMethodId, destination: string, instant = false) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Not authorized." };
  if (seller.status === "SUSPENDED") return { error: "Your seller account is suspended. Contact support for more information." };

  const wallet = await getSellerWallet(seller.id);
  if (amount <= 0 || amount > wallet.availableBalance) {
    return { error: "Requested amount exceeds your available balance." };
  }

  const feeAmount = instant ? INSTANT_PAYOUT_FEE : 0;
  if (instant && amount <= feeAmount) {
    return { error: `Amount must be more than ${INSTANT_PAYOUT_FEE} to cover the instant payout fee.` };
  }
  const netAmount = amount - feeAmount;

  // `amount` is what's debited from the seller's balance either way — the fee
  // is ATBP's cut of that withdrawal, not an extra charge on top of it. Only
  // `netAmount` actually gets disbursed to the seller's account.
  const provider = getPayoutProvider(method);
  const result = await provider.disburse(netAmount, destination);

  const payout = await prisma.payout.create({
    data: {
      sellerId: seller.id,
      amount,
      feeAmount,
      instant,
      method,
      destination,
      status: result.success ? (instant ? "PAID" : "PROCESSING") : "FAILED",
      processedAt: result.success && instant ? new Date() : null,
    },
  });

  revalidatePath("/studio/payouts");
  return { success: true, payout };
}
