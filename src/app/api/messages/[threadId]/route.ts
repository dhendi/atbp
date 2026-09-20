import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const thread = await prisma.messageThread.findUnique({ where: { id: threadId }, include: { seller: true } });
  if (!thread) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isParticipant = thread.buyerId === session.user.id || thread.seller.userId === session.user.id;
  if (!isParticipant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.message.findMany({ where: { threadId }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({
    messages: messages.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, imageUrl: m.imageUrl, createdAt: m.createdAt.toISOString() })),
  });
}
