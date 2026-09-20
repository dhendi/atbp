import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { MapPin, PartyPopper, Package, HandHeart, ArrowRight, CalendarDays } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPeso } from "@/lib/utils";
import { toProductCardData } from "@/lib/product-card-data";
import { getTrendingProductIdSet } from "@/lib/trending";
import {
  getSelectedArea,
  getNearbySellers,
  getNearbyProducts,
  getLocalDeals,
  getFreeNearYou,
  getRecommendedNearby,
  getLocalEvents,
  getLocalDrops,
  getLocalMarkets,
  getWeekendDigest,
  getShopStatus,
  getPublicLocationLabel,
} from "@/lib/services/local";
import { getSavedProductIdSet } from "@/lib/services/wishlist";
import { getSocialProofMap } from "@/lib/services/social-proof";
import { SectionHeader } from "@/components/domain/section-header";
import { AreaPicker } from "@/components/domain/area-picker";
import { LocalFilterBar } from "@/components/domain/local-filter-bar";
import { LocalViewToggle } from "@/components/domain/local-view-toggle";
import { LocalPinMap } from "@/components/domain/local-pin-map";
import { ProductCard } from "@/components/domain/product-card";
import { DropCard } from "@/components/domain/drop-card";
import { EventCard } from "@/components/domain/event-card";
import { EmptyState } from "@/components/domain/empty-state";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const dynamic = "force-dynamic";

const LOCAL_TITLE = "ATBP Near You";
const LOCAL_DESCRIPTION =
  "Discover local sellers, pickup-friendly products, and nearby events, drops, and markets on ATBP based on your area in the Philippines.";

export const metadata: Metadata = {
  title: LOCAL_TITLE,
  description: LOCAL_DESCRIPTION,
  openGraph: { title: LOCAL_TITLE, description: LOCAL_DESCRIPTION, type: "website" },
  twitter: { card: "summary_large_image", title: LOCAL_TITLE, description: LOCAL_DESCRIPTION },
};

export default async function LocalPage({ searchParams }: { searchParams: Promise<{ view?: string; open?: string; pickup?: string }> }) {
  const sp = await searchParams;
  const session = await auth();
  const area = await getSelectedArea();

  if (!area) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <MapPin size={32} className="mx-auto text-brand-500" />
        <h1 className="font-display mt-3 text-2xl font-semibold text-ink-900">ATBP Near You</h1>
        <p className="mt-2 text-sm text-ink-500">Set your area to see local sellers, pickup-friendly products, and what&apos;s happening nearby this weekend.</p>
        <div className="mt-5 flex justify-center">
          <AreaPicker area={null} />
        </div>
      </div>
    );
  }

  const view = sp.view === "map" ? "map" : "list";
  const openOnly = sp.open === "1";
  const pickupOnly = sp.pickup === "1";

  const [sellers, products, deals, freeItems, recommended, events, drops, markets, weekend, myDropReminders] = await Promise.all([
    getNearbySellers(area, 20),
    getNearbyProducts(area, 24),
    getLocalDeals(area, 12),
    getFreeNearYou(area, 8),
    getRecommendedNearby(area, 12),
    getLocalEvents(area, 6),
    getLocalDrops(area, 8),
    getLocalMarkets(area, 5),
    getWeekendDigest(area),
    session?.user ? prisma.dropReminder.findMany({ where: { userId: session.user.id } }) : Promise.resolve([]),
  ]);
  const remindedDropIds = new Set(myDropReminders.map((r) => r.dropId));

  const sellersFiltered = sellers.filter((s) => {
    if (pickupOnly && !s.pickupAvailable) return false;
    if (openOnly) {
      const status = s.physicalPresence !== "ONLINE_ONLY" ? getShopStatus(s.hours, s.temporarilyClosed) : null;
      if (!status?.isOpen) return false;
    }
    return true;
  });
  const productsFiltered = products.filter((p) => (pickupOnly ? p.pickupAvailable : true));

  const trendingIds = await getTrendingProductIdSet();
  const [savedIds, socialProofMap] = await Promise.all([
    getSavedProductIdSet(session?.user?.id),
    getSocialProofMap(
      [...productsFiltered, ...deals, ...freeItems, ...recommended].map((p) => ({ id: p.id, quantityAvailable: p.quantityAvailable }))
    ),
  ]);
  const cardOpts = (id: string) => ({ isSaved: savedIds.has(id), socialProof: socialProofMap.get(id) });

  const hasWeekendPlans = weekend.events.length > 0 || weekend.drops.length > 0 || weekend.deals.length > 0;
  const weekendLabel = `${weekend.range.start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}–${weekend.range.end.toLocaleDateString("en-PH", { day: "numeric" })}`;

  const mapPins = sellersFiltered.map((s) => ({ id: s.id, label: s.shopName, href: `/seller/${s.handle}`, lat: s.mapLat, lng: s.mapLng, area, kind: "seller" as const }));

  return (
    <div className="space-y-10 pb-10 pt-4 md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6">
        <div>
          <p className="font-tag mb-1 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-600">
            <MapPin size={12} /> Near You
          </p>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink-900 md:text-3xl">What&apos;s at ATBP in {area}</h1>
        </div>
        <AreaPicker area={area} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-6">
        <LocalFilterBar />
        <LocalViewToggle />
      </div>

      {/* ---------- THIS WEEKEND ---------- */}
      <section className="px-4 md:px-6">
        <div className="rounded-card bg-ink-900 p-5 text-white md:p-7">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-300">
            <PartyPopper size={13} /> This Weekend · {weekendLabel}
          </p>
          {!hasWeekendPlans ? (
            <p className="mt-2 text-sm text-white/70">Nothing lined up in {area} yet. Check back later in the week, or explore what&apos;s happening in other areas.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {weekend.events.map((e) => (
                <Link key={e.id} href={`/events/${e.id}`} className="rounded-2xl bg-white/10 p-3 hover:bg-white/15">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-300">Event</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{e.name}</p>
                  <p className="text-xs text-white/60">{new Date(e.eventDate).toLocaleDateString("en-PH", { weekday: "short", month: "short", day: "numeric" })}</p>
                </Link>
              ))}
              {weekend.drops.map((d) => (
                <Link key={d.id} href={`/drops/${d.id}`} className="rounded-2xl bg-white/10 p-3 hover:bg-white/15">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-300">Drop</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{d.name}</p>
                  <p className="text-xs text-white/60">{d.seller.shopName}</p>
                </Link>
              ))}
              {weekend.deals.map((p) => (
                <Link key={p.id} href={`/product/${p.id}`} className="rounded-2xl bg-white/10 p-3 hover:bg-white/15">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-brand-300">Deal</p>
                  <p className="mt-0.5 truncate text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-white/60">{formatPeso(p.dealPrice as number)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {view === "map" ? (
        <section className="px-4 md:px-6">
          <SectionHeader eyebrow="Map" title="Local shops & pickup spots" subtitle={`Sellers and ATBP pickup spots in ${area}`} />
          <LocalPinMap pins={mapPins} area={area} />
        </section>
      ) : (
        <section>
          <SectionHeader eyebrow="Sellers" title="Local shops" subtitle={`Based in ${area}`} />
          {sellersFiltered.length === 0 ? (
            <div className="px-4 md:px-6"><EmptyState icon={MapPin} title="No local shops match yet" description="Try clearing a filter, or check back as more sellers join." /></div>
          ) : (
            <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
              {sellersFiltered.map((s) => {
                const status = s.physicalPresence !== "ONLINE_ONLY" ? getShopStatus(s.hours, s.temporarilyClosed) : null;
                return (
                  <Link key={s.id} href={`/seller/${s.handle}`} className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={s.logoUrl ?? undefined} />
                      <AvatarFallback>{s.shopName[0]}</AvatarFallback>
                    </Avatar>
                    <span className="line-clamp-1 text-xs font-semibold text-ink-700">{s.shopName}</span>
                    <span className="line-clamp-1 text-[10px] text-ink-400">{getPublicLocationLabel(s)}</span>
                    {status?.label && (
                      <span className={status.isOpen ? "text-[10px] font-semibold text-live-600" : "text-[10px] text-ink-400"}>{status.isOpen ? "Open" : status.label}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---------- NEARBY PRODUCTS ---------- */}
      <section>
        <SectionHeader eyebrow="Products" title="Nearby products" subtitle={pickupOnly ? "Pickup-friendly items near you" : `Newly listed in ${area}`} />
        {productsFiltered.length === 0 ? (
          <div className="px-4 md:px-6"><EmptyState icon={Package} title="Nothing matches yet" description="Try clearing a filter." /></div>
        ) : (
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {productsFiltered.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---------- LOCAL DEALS ---------- */}
      {deals.length > 0 && (
        <section>
          <SectionHeader eyebrow="🏷️ Local deals" title="Deals near you" seeAllHref="/deals" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {deals.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- FREE NEAR YOU ---------- */}
      {freeItems.length > 0 && (
        <section>
          <SectionHeader eyebrow="🎁 Free Near You" title="Free finds nearby" subtitle="Zero-cost listings from sellers in your area" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {freeItems.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- LOCAL EVENTS ---------- */}
      {events.length > 0 && (
        <section>
          <SectionHeader eyebrow="IRL" title="Happening near you" seeAllHref="/events" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {events.map((e) => (
              <EventCard key={e.id} event={{ id: e.id, name: e.name, city: e.city, venue: e.venue, coverImage: e.coverImage, eventDate: e.eventDate }} />
            ))}
          </div>
        </section>
      )}

      {/* ---------- MARKETS NEAR YOU ---------- */}
      {markets.length > 0 && (
        <section>
          <SectionHeader eyebrow="🎪 IRL" title="Markets near you" subtitle={`Real-world maker markets in ${area}`} seeAllHref="/markets" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {markets.map((m) => (
              <Link key={m.id} href="/markets" className="relative block h-40 w-64 shrink-0 overflow-hidden rounded-card bg-ink-100">
                <Image src={m.imageUrl} alt={m.name} fill className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-white/80">
                    <CalendarDays size={11} /> {m.city}
                  </p>
                  <p className="font-display text-sm font-semibold leading-tight">{m.name}</p>
                  {m.schedule && <p className="text-[11px] text-white/70">{m.schedule}</p>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ---------- LOCAL DROPS ---------- */}
      {drops.length > 0 && (
        <section>
          <SectionHeader eyebrow="Drops" title="Local drops" seeAllHref="/drops" />
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2 md:px-6">
            {drops.map((d) => (
              <DropCard
                key={d.id}
                drop={{ id: d.id, name: d.name, coverImage: d.coverImage, releaseAt: d.releaseAt.toISOString(), seller: d.seller, quantityAvailable: d.products.reduce((sum, p) => sum + p.quantityAvailable, 0) }}
                isReminded={remindedDropIds.has(d.id)}
                loggedIn={!!session?.user}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- RECOMMENDED NEARBY ---------- */}
      {recommended.length > 0 && (
        <section>
          <SectionHeader eyebrow="✨ For you" title="Recommended near you" />
          <div className="no-scrollbar flex gap-4 overflow-x-auto px-4 pb-2 md:px-6">
            {recommended.map((p) => (
              <div key={p.id} className="w-[168px] shrink-0 md:w-[200px]">
                <ProductCard product={toProductCardData(p, { trending: trendingIds.has(p.id), ...cardOpts(p.id) })} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- LOOKING FOR ---------- */}
      <section className="px-4 md:px-6">
        <Link href="/local/looking-for" className="flex items-center justify-between rounded-card border border-ink-200 bg-white p-4 hover:border-brand-300">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-600"><HandHeart size={18} /></span>
            <div>
              <p className="font-bold text-ink-900">Looking For</p>
              <p className="text-xs text-ink-500">Post what you&apos;re hoping to find, and sellers near you can reply</p>
            </div>
          </div>
          <ArrowRight size={16} className="text-ink-400" />
        </Link>
      </section>
    </div>
  );
}
