import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LiveRoom } from "./live-room";

export default async function LiveWatchPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  const [stream, session] = await Promise.all([
    prisma.livestream.findUnique({ where: { id: streamId } }),
    auth(),
  ]);
  if (!stream) notFound();

  return <LiveRoom streamId={streamId} isLoggedIn={!!session?.user} />;
}
