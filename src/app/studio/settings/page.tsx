import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLeafCategories } from "@/lib/categories";
import { SettingsForm } from "./settings-form";
import { LocalSettingsForm } from "./local-settings-form";
import { LocalDeliveryForm } from "./local-delivery-form";
import { MultiLocationManager } from "./multi-location-manager";
import { PrimaryCategoriesForm } from "./primary-categories-form";
import { CloseStorePanel } from "./close-store-panel";
import { IdVerificationPanel } from "./id-verification-panel";
import { getStoreClosureBlockers } from "@/lib/services/store-closure";

export const dynamic = "force-dynamic";

export default async function StudioSettingsPage() {
  const session = await auth();
  const [seller, leafCategories] = await Promise.all([
    prisma.sellerProfile.findUnique({
      where: { userId: session!.user.id },
      include: {
        hours: true,
        locations: { include: { hours: true } },
        warnings: { where: { active: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    getLeafCategories(),
  ]);
  const closureBlockers = seller!.status === "APPROVED" ? await getStoreClosureBlockers(seller!.id) : [];

  return (
    <div className="space-y-10">
      {seller!.warnings.length > 0 && (
        <div className="rounded-2xl border border-live-300 bg-live-50 p-4">
          <p className="text-sm font-bold text-live-700">
            {seller!.warnings.length} active warning{seller!.warnings.length === 1 ? "" : "s"} on your account
          </p>
          <p className="mt-1 text-xs text-live-700">
            {seller!.warnings.length >= 3
              ? "Your account has been suspended pending review. Contact support."
              : "3 active warnings will suspend your account pending review."}
          </p>
          <div className="mt-3 space-y-2">
            {seller!.warnings.map((w) => (
              <div key={w.id} className="rounded-xl bg-white/70 p-2.5 text-xs">
                <p className="font-semibold text-ink-800">{w.productTitle}</p>
                <p className="mt-0.5 text-ink-600">{w.reason}</p>
                <p className="mt-0.5 text-ink-400">{w.createdAt.toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-6 text-xl font-extrabold text-ink-900">Identity Verification</h2>
        <IdVerificationPanel
          idVerified={seller!.idVerified}
          idDocumentType={seller!.idDocumentType}
          idRejectedReason={seller!.idRejectedReason}
          needsBusinessLicense={seller!.sellerKind === "BUSINESS" && !seller!.birVerified}
        />
      </div>

      <div>
        <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Shop Settings</h1>
        <SettingsForm
          initial={{
            shopName: seller!.shopName,
            description: seller!.description ?? "",
            bannerUrl: seller!.bannerUrl ?? "",
            logoUrl: seller!.logoUrl ?? "",
            province: seller!.province ?? "",
            announcement: seller!.announcement ?? "",
            socialLinks: (seller!.socialLinks as { facebook?: string; instagram?: string; tiktok?: string }) ?? {},
            returnPolicy: seller!.returnPolicy ?? "",
          }}
          handle={seller!.handle}
        />
      </div>

      <div>
        <h2 className="mb-6 text-xl font-extrabold text-ink-900">Categories</h2>
        <PrimaryCategoriesForm
          categories={leafCategories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }))}
          initial={seller!.primaryCategories as string[]}
        />
      </div>

      <div>
        <h2 className="mb-1 text-xl font-extrabold text-ink-900">Local &amp; Pickup</h2>
        <p className="mb-6 text-sm text-ink-500">Help nearby buyers find you: your area (from Province / City above) is always shown; an exact address is opt-in only.</p>
        <LocalSettingsForm
          isCasualSeller={!seller!.birVerified}
          initial={{
            physicalPresence: seller!.physicalPresence,
            publicAddress: seller!.publicAddress ?? "",
            showExactAddress: seller!.showExactAddress,
            pickupAvailable: seller!.pickupAvailable,
            pickupInstructions: seller!.pickupInstructions ?? "",
            temporarilyClosed: seller!.temporarilyClosed,
            hours: seller!.hours
              .slice()
              .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
              .map((h) => ({
                dayOfWeek: h.dayOfWeek,
                opensAt: h.opensAt,
                closesAt: h.closesAt,
                closed: h.closed,
                open24h: h.open24h,
                byAppointment: h.byAppointment,
              })),
          }}
        />

        {seller!.physicalPresence === "MULTIPLE_LOCATIONS" && (
          <div className="mt-6">
            <MultiLocationManager
              locations={seller!.locations.map((loc) => ({
                id: loc.id,
                label: loc.label,
                province: loc.province,
                publicAddress: loc.publicAddress,
                showExactAddress: loc.showExactAddress,
                pickupAvailable: loc.pickupAvailable,
                pickupInstructions: loc.pickupInstructions,
                hours: loc.hours
                  .slice()
                  .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
                  .map((h) => ({
                    dayOfWeek: h.dayOfWeek,
                    opensAt: h.opensAt,
                    closesAt: h.closesAt,
                    closed: h.closed,
                    open24h: h.open24h,
                    byAppointment: h.byAppointment,
                  })),
              }))}
            />
          </div>
        )}

        <div className="mt-6">
          <LocalDeliveryForm
            initial={{
              localDeliveryAvailable: seller!.localDeliveryAvailable,
              localDeliveryFee: seller!.localDeliveryFee?.toString() ?? "",
              localDeliveryAreas: seller!.localDeliveryAreas as string[],
            }}
          />
        </div>
      </div>

      {(seller!.status === "APPROVED" || seller!.status === "CLOSED") && (
        <div>
          <h2 className="mb-6 text-xl font-extrabold text-ink-900">Store Status</h2>
          <CloseStorePanel
            status={seller!.status}
            closedAt={seller!.closedAt ? seller!.closedAt.toISOString() : null}
            closeReason={seller!.closeReason}
            blockers={closureBlockers}
          />
        </div>
      )}
    </div>
  );
}
