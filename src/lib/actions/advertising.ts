"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { safeHttpsUrl } from "@/lib/safe-url";
import { logAdminAction } from "@/lib/services/audit-log";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export interface CreateAdInput {
  advertiserName: string;
  contactEmail: string;
  campaignName: string;
  budget?: number;
  startAt: string;
  endAt: string;
  creativeImageUrl: string;
  destinationUrl: string;
  placements: string[]; // HOMEPAGE | CATEGORY | SEARCH | SELLER_PAGE | EVENT_PAGE
  cpc?: number;
}

export async function createAdvertiserAndAdAction(input: CreateAdInput) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  if (input.placements.length === 0) return { error: "Pick at least one placement." };
  // The click route redirects straight to this, so anything but a plain https
  // URL (javascript:, data:, garbage) would be a redirect gadget.
  const destinationUrl = safeHttpsUrl(input.destinationUrl);
  if (!destinationUrl) return { error: "The destination link must be a full https:// address." };
  const creativeImageUrl = safeHttpsUrl(input.creativeImageUrl);
  if (!creativeImageUrl) return { error: "The creative image link isn't valid." };

  const advertiser = await prisma.advertiser.create({
    data: { name: input.advertiserName, contactEmail: input.contactEmail, status: "APPROVED" },
  });
  const campaign = await prisma.adCampaign.create({
    data: {
      advertiserId: advertiser.id, name: input.campaignName, budget: input.budget,
      status: "ACTIVE", startAt: new Date(input.startAt), endAt: new Date(input.endAt),
    },
  });
  const ad = await prisma.advertisement.create({
    data: { campaignId: campaign.id, creativeImageUrl, destinationUrl, cpc: input.cpc, status: "ACTIVE" },
  });
  await prisma.adPlacement.createMany({
    data: input.placements.map((placement) => ({ advertisementId: ad.id, placement })),
  });
  await logAdminAction(admin.id, "CREATE_ADVERTISEMENT", "Advertiser", advertiser.id, { advertiserName: input.advertiserName, campaignName: input.campaignName });

  revalidatePath("/admin/advertising");
  revalidatePath("/");
  return { success: true };
}

/** The gap the handbook flagged: the schema always supported Paused/Ended on
 * both AdCampaign and Advertisement, but no admin action ever reached them —
 * create was the only lever. getActiveAd() gates on Advertisement.status
 * *and* campaign.status both being ACTIVE, so updating the ad's own status
 * here is enough to stop or resume it showing without touching the campaign. */
export async function updateAdvertisementStatusAction(adId: string, status: "ACTIVE" | "PAUSED" | "ENDED") {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  const ad = await prisma.advertisement.update({ where: { id: adId }, data: { status } });
  await logAdminAction(admin.id, "UPDATE_ADVERTISEMENT_STATUS", "Advertisement", adId, { status });
  revalidatePath("/admin/advertising");
  revalidatePath("/");
  return { success: true, ad };
}

export async function deleteAdvertisementAction(adId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.advertisement.delete({ where: { id: adId } });
  await logAdminAction(admin.id, "DELETE_ADVERTISEMENT", "Advertisement", adId);
  revalidatePath("/admin/advertising");
  revalidatePath("/");
  return { success: true };
}
