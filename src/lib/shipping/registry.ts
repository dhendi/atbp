import type { ShippingProvider } from "./types";
export type { ShippingRateEstimate } from "./types";
import { manualProvider } from "./providers/manual";
import { ninjaVanProvider } from "./providers/ninjavan";
import { pickupProvider } from "./providers/pickup";

const allProviders: ShippingProvider[] = [manualProvider, ninjaVanProvider, pickupProvider];

/** Manual and Pickup are always on; every courier adapter is registered but
 * gated behind its own env vars — activating one later means setting env
 * vars, not shipping code. Add a new courier by adding it to allProviders
 * above and a case here, nothing else in the app needs to change. */
function isActive(id: string): boolean {
  if (id === "MANUAL" || id === "PICKUP") return true;
  if (id === "NINJAVAN") {
    return process.env.NINJAVAN_ACTIVE === "true" && !!process.env.NINJAVAN_CLIENT_ID && !!process.env.NINJAVAN_CLIENT_SECRET;
  }
  return false;
}

export function getShippingProvider(id: string): ShippingProvider | undefined {
  const provider = allProviders.find((p) => p.id === id);
  return provider && isActive(provider.id) ? provider : undefined;
}

/** Providers sellers/checkout can actually select right now. */
export function getActiveShippingProviders(): ShippingProvider[] {
  return allProviders.filter((p) => isActive(p.id));
}

/** Gates the COD payment option at checkout — COD only makes sense when a
 * courier that can actually collect and remit it is active (manual can't). */
export function codCapableProviderActive(): boolean {
  return getActiveShippingProviders().some((p) => p.supportsCOD);
}

export interface ShippingOption {
  providerId: string;
  label: string;
  fee: number;
  etaDays?: number;
}

/** Buyer-facing courier options for checkout's shipping-method picker (SHIP
 * fulfillment only — local pickup is a separate, non-courier fulfillment
 * method with its own picker). Only active providers appear, and only ones
 * that can actually quote a rate — see the getRate note on ShippingProvider.
 * At launch this returns exactly one option (manual/flat-fee); once another
 * courier activates with a real rate quote, it appears here automatically. */
export async function getShippingOptionsFor(input: { declaredValue: number }): Promise<ShippingOption[]> {
  const options: ShippingOption[] = [];
  for (const provider of getActiveShippingProviders()) {
    if (!provider.getRate) continue;
    const rate = await provider.getRate(input);
    options.push({ providerId: provider.id, label: provider.label, fee: rate.fee, etaDays: rate.etaDays });
  }
  return options;
}
