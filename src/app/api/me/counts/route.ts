import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ cartCount: 0, unreadNotifications: 0, unreadMessages: 0 });

  const cart = await prisma.cart.findUnique({ where: { userId: session.user.id }, include: { items: true } });
  const unreadNotifications = await prisma.notification.count({ where: { userId: session.user.id, read: false } });

  const threads = await prisma.messageThread.findMany({
    where: { OR: [{ buyerId: session.user.id }, { seller: { userId: session.user.id } }] },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const unreadMessages = threads.filter((t) => t.messages[0] && t.messages[0].senderId !== session.user.id && !t.messages[0].readAt).length;

  return NextResponse.json({
    cartCount: cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0,
    unreadNotifications,
    unreadMessages,
  });
}
