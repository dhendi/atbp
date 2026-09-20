"use server";

import { revalidatePath, updateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/services/notifications";
import { logAdminAction } from "@/lib/services/audit-log";
import { eventInputSchema, firstIssue } from "@/lib/validation";

export async function toggleEventInterestAction(eventId: string, type: "INTERESTED" | "SAVED") {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };

  const existing = await prisma.eventInterest.findUnique({
    where: { eventId_userId_type: { eventId, userId: session.user.id, type } },
  });

  if (existing) {
    await prisma.eventInterest.delete({ where: { id: existing.id } });
    revalidatePath("/events");
    revalidatePath(`/events/${eventId}`);
    return { success: true, active: false };
  }

  await prisma.eventInterest.create({ data: { eventId, userId: session.user.id, type } });
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  return { success: true, active: true };
}

/** A seller marking their own shop as participating in an event — "See us at [Event Name]" on their profile. */
export async function joinEventAsSellerAction(eventId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "You need a seller account." };

  await prisma.eventSeller.upsert({
    where: { eventId_sellerId: { eventId, sellerId: seller.id } },
    update: {},
    create: { eventId, sellerId: seller.id },
  });
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/seller/${seller.handle}`);
  updateTag("sellers");
  return { success: true };
}

export async function leaveEventAsSellerAction(eventId: string) {
  const session = await auth();
  if (!session?.user) return { error: "Please log in first." };
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: session.user.id } });
  if (!seller) return { error: "You need a seller account." };

  await prisma.eventSeller.deleteMany({ where: { eventId, sellerId: seller.id } });
  revalidatePath(`/events/${eventId}`);
  revalidatePath(`/seller/${seller.handle}`);
  updateTag("sellers");
  return { success: true };
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session.user;
}

export interface EventInput {
  name: string;
  coverImage: string;
  description: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  venue: string;
  city: string;
  address?: string;
  admissionPrice?: string;
  websiteUrl?: string;
  categories: string[];
  organiserName: string;
}

export async function createEventAction(input: EventInput) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };

  const eventResult = eventInputSchema.safeParse({
    name: input.name,
    description: input.description,
    venue: input.venue,
    city: input.city,
    organiserName: input.organiserName,
  });
  if (!eventResult.success) return { error: firstIssue(eventResult) };
  input.name = eventResult.data.name;
  input.description = eventResult.data.description;
  input.venue = eventResult.data.venue;
  input.city = eventResult.data.city;
  input.organiserName = eventResult.data.organiserName;

  const event = await prisma.event.create({
    data: { ...input, eventDate: new Date(input.eventDate), status: "UPCOMING" },
  });
  await logAdminAction(admin.id, "CREATE_EVENT", "Event", event.id, { name: event.name });

  const nearby = await prisma.user.findMany({ where: { area: event.city, notifyLocalEvents: true }, take: 100 });
  for (const user of nearby) {
    await notify(user.id, "LOCAL_EVENT", `New event in ${event.city}`, `${event.name} was just added: ${new Date(event.eventDate).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}.`, `/events/${event.id}`);
  }

  revalidatePath("/events");
  revalidatePath("/admin/events");
  updateTag("events");
  return { success: true, event };
}

export async function updateEventStatusAction(eventId: string, status: "UPCOMING" | "LIVE" | "ENDED" | "CANCELLED") {
  const admin = await requireAdmin();
  if (!admin) return { error: "Not authorized." };
  await prisma.event.update({ where: { id: eventId }, data: { status } });
  await logAdminAction(admin.id, "UPDATE_EVENT_STATUS", "Event", eventId, { status });
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/admin/events");
  updateTag("events");
  return { success: true };
}
