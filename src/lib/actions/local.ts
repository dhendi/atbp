"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AREA_COOKIE, isValidArea } from "@/lib/local-shared";

export async function setAreaAction(area: string) {
  if (!isValidArea(area)) return { error: "Unknown area." };
  const store = await cookies();
  store.set(AREA_COOKIE, area, { maxAge: 60 * 60 * 24 * 365, path: "/" });

  const session = await auth();
  if (session?.user) {
    await prisma.user.update({ where: { id: session.user.id }, data: { area } });
  }
  return { success: true };
}

export async function clearAreaAction() {
  const store = await cookies();
  store.delete(AREA_COOKIE);
  return { success: true };
}

export type ShopHoursInput = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  closed: boolean;
  open24h: boolean;
  byAppointment: boolean;
};

export async function updateSellerLocalSettingsAction(input: {
  physicalPresence: string;
  publicAddress?: string;
  showExactAddress: boolean;
  pickupAvailable: boolean;
  pickupInstructions?: string;
  temporarilyClosed: boolean;
  hours: ShopHoursInput[];
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Not authorized." };

  const VALID_PRESENCE = ["ONLINE_ONLY", "HOME_STUDIO", "PHYSICAL_STORE", "MARKET_VENDOR", "WORKSHOP", "MULTIPLE_LOCATIONS"];
  if (!VALID_PRESENCE.includes(input.physicalPresence)) return { error: "Invalid shop type." };

  await prisma.$transaction([
    prisma.sellerProfile.update({
      where: { id: seller.id },
      data: {
        physicalPresence: input.physicalPresence,
        publicAddress: input.publicAddress?.trim() || null,
        showExactAddress: input.showExactAddress,
        pickupAvailable: input.pickupAvailable,
        pickupInstructions: input.pickupInstructions?.trim() || null,
        temporarilyClosed: input.temporarilyClosed,
      },
    }),
    prisma.shopHours.deleteMany({ where: { sellerId: seller.id } }),
    ...(input.hours.length
      ? [
          prisma.shopHours.createMany({
            data: input.hours.map((h) => ({
              sellerId: seller.id,
              dayOfWeek: h.dayOfWeek,
              opensAt: h.closed ? null : h.opensAt,
              closesAt: h.closed ? null : h.closesAt,
              closed: h.closed,
              open24h: h.open24h,
              byAppointment: h.byAppointment,
            })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/studio/settings");
  revalidatePath(`/seller/${seller.handle}`);
  return { success: true };
}

export async function updateSellerLocalDeliveryAction(input: {
  localDeliveryAvailable: boolean;
  localDeliveryFee?: number;
  localDeliveryAreas: string[];
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "Not authorized." };

  const areas = input.localDeliveryAreas.filter(isValidArea);

  await prisma.sellerProfile.update({
    where: { id: seller.id },
    data: {
      localDeliveryAvailable: input.localDeliveryAvailable,
      localDeliveryFee: input.localDeliveryFee ?? null,
      localDeliveryAreas: areas,
    },
  });
  revalidatePath("/studio/settings");
  return { success: true };
}

async function requireSellerForLocations() {
  const session = await auth();
  if (!session?.user) return null;
  return prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
}

export async function addSellerLocationAction(input: {
  label: string;
  province: string;
  publicAddress?: string;
  showExactAddress: boolean;
  pickupAvailable: boolean;
  pickupInstructions?: string;
  hours: ShopHoursInput[];
}) {
  const seller = await requireSellerForLocations();
  if (!seller) return { error: "Not authorized." };
  if (!input.label.trim() || !input.province.trim()) return { error: "Label and area are required." };

  const location = await prisma.sellerLocation.create({
    data: {
      sellerId: seller.id,
      label: input.label.trim(),
      province: input.province,
      publicAddress: input.publicAddress?.trim() || null,
      showExactAddress: input.showExactAddress,
      pickupAvailable: input.pickupAvailable,
      pickupInstructions: input.pickupInstructions?.trim() || null,
    },
  });
  if (input.hours.length) {
    await prisma.sellerLocationHours.createMany({
      data: input.hours.map((h) => ({
        locationId: location.id,
        dayOfWeek: h.dayOfWeek,
        opensAt: h.closed ? null : h.opensAt,
        closesAt: h.closed ? null : h.closesAt,
        closed: h.closed,
        open24h: h.open24h,
        byAppointment: h.byAppointment,
      })),
    });
  }
  revalidatePath("/studio/settings");
  revalidatePath(`/seller/${seller.handle}`);
  return { success: true, locationId: location.id };
}

export async function updateSellerLocationAction(
  locationId: string,
  input: {
    label: string;
    province: string;
    publicAddress?: string;
    showExactAddress: boolean;
    pickupAvailable: boolean;
    pickupInstructions?: string;
    hours: ShopHoursInput[];
  }
) {
  const seller = await requireSellerForLocations();
  if (!seller) return { error: "Not authorized." };

  const existing = await prisma.sellerLocation.findFirst({ where: { id: locationId, sellerId: seller.id } });
  if (!existing) return { error: "Location not found." };

  await prisma.$transaction([
    prisma.sellerLocation.update({
      where: { id: locationId },
      data: {
        label: input.label.trim(),
        province: input.province,
        publicAddress: input.publicAddress?.trim() || null,
        showExactAddress: input.showExactAddress,
        pickupAvailable: input.pickupAvailable,
        pickupInstructions: input.pickupInstructions?.trim() || null,
      },
    }),
    prisma.sellerLocationHours.deleteMany({ where: { locationId } }),
    ...(input.hours.length
      ? [
          prisma.sellerLocationHours.createMany({
            data: input.hours.map((h) => ({
              locationId,
              dayOfWeek: h.dayOfWeek,
              opensAt: h.closed ? null : h.opensAt,
              closesAt: h.closed ? null : h.closesAt,
              closed: h.closed,
              open24h: h.open24h,
              byAppointment: h.byAppointment,
            })),
          }),
        ]
      : []),
  ]);
  revalidatePath("/studio/settings");
  revalidatePath(`/seller/${seller.handle}`);
  return { success: true };
}

export async function deleteSellerLocationAction(locationId: string) {
  const seller = await requireSellerForLocations();
  if (!seller) return { error: "Not authorized." };

  const existing = await prisma.sellerLocation.findFirst({ where: { id: locationId, sellerId: seller.id } });
  if (!existing) return { error: "Location not found." };

  await prisma.sellerLocation.delete({ where: { id: locationId } });
  revalidatePath("/studio/settings");
  revalidatePath(`/seller/${seller.handle}`);
  return { success: true };
}

export async function updateNotificationPrefsAction(input: {
  notifyLocalDrops: boolean;
  notifyLocalEvents: boolean;
  notifyNearbySellers: boolean;
}) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  // Named fields, not `data: input` — see the identical note in
  // updateWishlistNotificationPrefsAction (lib/actions/notifications.ts).
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      notifyLocalDrops: !!input.notifyLocalDrops,
      notifyLocalEvents: !!input.notifyLocalEvents,
      notifyNearbySellers: !!input.notifyNearbySellers,
    },
  });
  revalidatePath("/notifications");
  return { success: true };
}
