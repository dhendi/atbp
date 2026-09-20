import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Calendar, Clock, MapPin, Ticket, Globe, Users, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EventInterestButtons } from "./event-interest-buttons";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const event = await prisma.event.findUnique({ where: { id } });
  if (!event) return { title: "Event not found" };

  const title = `${event.name}, ${event.city}`;
  const description = event.description?.slice(0, 160) ?? `${event.name} at ${event.venue} in ${event.city}, organised by ${event.organiserName}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: event.coverImage ? [{ url: event.coverImage }] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: event.coverImage ? [event.coverImage] : undefined,
    },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      sellers: { include: { seller: true } },
      organiserSeller: true,
    },
  });
  if (!event) notFound();

  const [interestedCount, savedCount, myInterests, activePromotion] = await Promise.all([
    prisma.eventInterest.count({ where: { eventId: id, type: "INTERESTED" } }),
    prisma.eventInterest.count({ where: { eventId: id, type: "SAVED" } }),
    session?.user
      ? prisma.eventInterest.findMany({ where: { eventId: id, userId: session.user.id } })
      : Promise.resolve([]),
    prisma.eventPromotion.findFirst({ where: { eventId: id, status: "ACTIVE", startAt: { lte: new Date() }, endAt: { gte: new Date() } } }),
  ]);
  const categories = event.categories as string[];
  const socialLinks = event.socialLinks as Record<string, string>;

  return (
    <div className="pb-10">
      <div className="relative h-64 w-full md:h-80">
        <Image src={event.coverImage} alt={event.name} fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
        {activePromotion && (
          <span className="absolute left-4 top-4 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-ink-900">
            Sponsored: Featured Event
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 p-4 text-white md:p-6">
          <Badge variant={event.status === "UPCOMING" ? "brand" : event.status === "LIVE" ? "live" : "subtle"}>{event.status}</Badge>
          <h1 className="font-display mt-2 text-2xl font-semibold md:text-3xl">{event.name}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-5 md:px-6">
        <div className="mb-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          <Detail icon={Calendar} label={new Date(event.eventDate).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} />
          {event.startTime && <Detail icon={Clock} label={event.endTime ? `${event.startTime} – ${event.endTime}` : event.startTime} />}
          <Detail icon={MapPin} label={`${event.venue}, ${event.city}`} />
          <Detail icon={Ticket} label={event.admissionPrice || "Free"} />
        </div>

        <EventInterestButtons
          eventId={event.id}
          loggedIn={!!session?.user}
          initialInterested={myInterests.some((i) => i.type === "INTERESTED")}
          initialSaved={myInterests.some((i) => i.type === "SAVED")}
          interestedCount={interestedCount}
          savedCount={savedCount}
        />

        <p className="mt-5 whitespace-pre-line text-sm leading-relaxed text-ink-700">{event.description}</p>

        {event.address && <p className="mt-2 text-sm text-ink-500">{event.address}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
          {event.websiteUrl && (
            <a href={event.websiteUrl} target="_blank" rel="noopener" className="flex items-center gap-1 font-semibold text-brand-600 hover:underline">
              <Globe size={14} /> Event website
            </a>
          )}
          {Object.entries(socialLinks).map(([key, url]) => (
            <a key={key} href={url} target="_blank" rel="noopener" className="font-semibold text-brand-600 hover:underline capitalize">
              {key}
            </a>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {categories.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
          </div>
        )}

        <p className="mt-4 text-xs text-ink-400">Organised by {event.organiserName}</p>

        {event.sellers.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-3 flex items-center gap-1.5 font-bold text-ink-900"><Users size={16} /> ATBP sellers at this event</h2>
            <div className="space-y-2">
              {event.sellers.map(({ seller }) => (
                <Link key={seller.id} href={`/seller/${seller.handle}`} className="flex items-center gap-3 rounded-2xl border border-ink-100 p-3 hover:bg-ink-50">
                  <Avatar>
                    <AvatarImage src={seller.logoUrl ?? undefined} />
                    <AvatarFallback>{seller.shopName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate font-bold text-ink-900">
                      {seller.shopName} {seller.verified && <ShieldCheck size={13} className="text-brand-500" />}
                    </p>
                    <p className="text-xs text-ink-500">@{seller.handle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label }: { icon: typeof Calendar; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-ink-100 p-2.5">
      <Icon size={15} className="shrink-0 text-brand-500" />
      <span className="truncate text-xs font-semibold text-ink-700">{label}</span>
    </div>
  );
}
