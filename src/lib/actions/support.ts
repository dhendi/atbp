"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { supportTicketInputSchema, firstIssue } from "@/lib/validation";

export type SupportTopic = "ORDER" | "PAYMENT" | "ACCOUNT" | "SELLING" | "OTHER";

export async function submitSupportTicketAction(input: {
  name: string;
  email: string;
  topic: SupportTopic;
  orderId?: string;
  message: string;
}) {
  const session = await auth();
  if (!input.name.trim() || !input.email.trim() || !input.message.trim()) {
    return { error: "Please fill in your name, email, and message." };
  }
  const ticketResult = supportTicketInputSchema.safeParse({ name: input.name, email: input.email, message: input.message });
  if (!ticketResult.success) return { error: firstIssue(ticketResult) };
  input.name = ticketResult.data.name;
  input.email = ticketResult.data.email;
  input.message = ticketResult.data.message;

  // This form is reachable while logged out, so rate-limit by IP rather than
  // user id — otherwise a guest could submit an unlimited number of tickets.
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await checkRateLimit(`support:${ip}`, 5, 60_000))) {
    return { error: "Too many requests. Please wait a moment before trying again." };
  }

  let orderId: string | undefined;
  if (input.orderId) {
    const order = await prisma.order.findFirst({
      where: { id: input.orderId, ...(session?.user ? { buyerId: session.user.id } : {}) },
    });
    orderId = order?.id;
  }

  await prisma.supportTicket.create({
    data: {
      userId: session?.user?.id,
      name: input.name,
      email: input.email,
      topic: input.topic,
      orderId,
      message: input.message,
    },
  });

  return { success: true };
}
