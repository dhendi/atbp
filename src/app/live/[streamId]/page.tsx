import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LiveRoom } from "./live-room";

// Private page: give it its own tab title (and keep it out of search results).
export const metadata = { title: "Live", robots: { index: false, follow: false } };

export default async function LiveWatchPage({ params }: { params: Promise<{ streamId: string }> }) {
  const { streamId } = await params;
  const [stream, session] = await Promise.all([
    prisma.livestream.findUnique({ where: { id: streamId }, include: { seller: { select: { status: true } } } }),
    auth(),
  ]);
  if (!stream || stream.seller.status === "SUSPENDED") notFound();

  return <LiveRoom streamId={streamId} isLoggedIn={!!session?.user} />;
}
