import type { Metadata } from "next";
import { Radio } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { LiveCard } from "@/components/domain/live-card";
import { UpcomingLiveCard } from "@/components/domain/upcoming-live-card";
import { SectionHeader } from "@/components/domain/section-header";
import { EmptyState } from "@/components/domain/empty-state";
import { LIVESTREAMS_ENABLED } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

const LIVE_TITLE = "Live";
const LIVE_DESCRIPTION =
  "Watch live selling streams on ATBP, chat, claim items, and bid in real time. Browse what's live now, upcoming, and recently ended.";

export const metadata: Metadata = {
  ...(LIVESTREAMS_ENABLED ? {} : { robots: { index: false, follow: false } }),
  title: LIVE_TITLE,
  description: LIVE_DESCRIPTION,
  openGraph: { title: LIVE_TITLE, description: LIVE_DESCRIPTION, images: ["/opengraph-image"], type: "website" },
  twitter: { card: "summary_large_image", title: LIVE_TITLE, description: LIVE_DESCRIPTION },
};

export default async function LiveBrowsePage() {
  if (!LIVESTREAMS_ENABLED) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          asPageHeading
          icon={Radio}
          title="Live selling is coming soon"
          description="We're holding off on live selling for now. Check back as ATBP grows."
          action={{ href: "/discover", label: "Explore ATBP" }}
        />
      </div>
    );
  }

  const session = await auth();

  const [live, upcoming, ended] = await Promise.all([
    prisma.livestream.findMany({ where: { status: "LIVE", seller: { status: "APPROVED" } }, include: { seller: true }, orderBy: { viewerCount: "desc" } }),
    prisma.livestream.findMany({ where: { status: "SCHEDULED", seller: { status: "APPROVED" } }, include: { seller: true, reminders: true }, orderBy: { scheduledAt: "asc" } }),
    prisma.livestream.findMany({ where: { status: "ENDED", seller: { status: "APPROVED" } }, include: { seller: true }, orderBy: { endedAt: "desc" }, take: 12 }),
  ]);

  return (
    <div className="space-y-9 pt-4 md:space-y-12 md:pt-6">
      <div className="px-4 md:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-ink-900">
          <Radio className="text-live-500" /> Live
        </h1>
        <p className="text-sm text-ink-500">Watch, chat, claim, and bid in real time.</p>
      </div>

      <section>
        <SectionHeader as="h1" title="Live Now" subtitle={`${live.length} streaming right now`} />
        {live.length === 0 ? (
          <div className="px-4 md:px-6">
            <EmptyState icon={Radio} title="No one's live right now" description="Set a reminder for an upcoming stream below." />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3 md:grid-cols-5 md:px-6">
            {live.map((s) => (
              <LiveCard
                key={s.id}
                stream={{ id: s.id, title: s.title, thumbnailUrl: s.thumbnailUrl, viewerCount: s.viewerCount, category: s.category, seller: s.seller }}
                size="large"
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeader title="Upcoming" subtitle="Set a reminder so you don't miss it" />
        <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1 md:px-6">
          {upcoming.map((s) => (
            <UpcomingLiveCard
              key={s.id}
              stream={{
                id: s.id,
                title: s.title,
                thumbnailUrl: s.thumbnailUrl,
                scheduledAt: s.scheduledAt.toISOString(),
                category: s.category,
                hasReminder: session ? s.reminders.some((r) => r.userId === session.user.id) : false,
                reminderCount: s.reminders.length,
                seller: s.seller,
              }}
            />
          ))}
        </div>
      </section>

      <section className="px-4 pb-4 md:px-6">
        <SectionHeader title="Recently Ended" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {ended.map((s) => (
            <div key={s.id} className="opacity-70 grayscale-[30%]">
              <LiveCard stream={{ id: s.id, title: s.title, thumbnailUrl: s.thumbnailUrl, viewerCount: s.peakViewers, category: s.category, seller: s.seller }} size="large" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
