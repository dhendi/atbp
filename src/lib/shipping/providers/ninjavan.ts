import { createHmac, timingSafeEqual } from "crypto";
import type { ShippingProvider, ShipmentStatus, TrackingUpdate } from "../types";

/**
 * ============================================================================
 * NINJA VAN ADAPTER — INACTIVE UNTIL CREDENTIALS EXIST. READ BEFORE ACTIVATING.
 * ============================================================================
 *
 * This is built to the ShippingProvider interface and wired into the registry
 * (lib/shipping/registry.ts), but it is NOT reachable from checkout or the
 * seller's ship-order flow until NINJAVAN_ACTIVE=true and both
 * NINJAVAN_CLIENT_ID / NINJAVAN_CLIENT_SECRET are set — see isActive() in the
 * registry. Nothing here has been tested against a real Ninja Van account,
 * because there isn't one yet.
 *
 * Before flipping this on, verify against Ninja Van's live merchant API docs:
 *
 * 1. AUTH ENDPOINT — `TOKEN_URL` below is a placeholder shape (OAuth2 client
 *    credentials grant). Confirm the exact token endpoint URL, whether it's
 *    sandbox vs. production per environment, and the token's actual expiry
 *    (this code assumes seconds-based `expires_in` and refreshes 60s early —
 *    confirm that field name matches the real response).
 * 2. CREATE-ORDER ENDPOINT — `createShipment()` below sends a payload shaped
 *    like Ninja Van's documented "Create Order" request, but the exact field
 *    names (address structure, parcel dimensions/weight requirements, COD
 *    field name and currency format) need to be checked against the current
 *    API version. This also assumes a single flat "service type" — confirm
 *    what service types/levels the account actually supports.
 * 3. WEBHOOK SIGNATURE VERIFICATION — `verifyWebhookSignature()` below
 *    implements an HMAC-SHA256 check against `NINJAVAN_WEBHOOK_SECRET`, on
 *    the assumption Ninja Van signs webhooks the common way (a per-request
 *    signature over the raw body, sent in a header). The header name
 *    (`x-ninjavan-hmac-sha256` below is a placeholder) and exact signing
 *    scheme are NOT confirmed against real docs — verify both before
 *    activation. The route (app/api/webhooks/ninjavan/route.ts) already
 *    rejects any request that fails this check with 401, so nothing unsigned
 *    reaches handleWebhook() once NINJAVAN_WEBHOOK_SECRET is set.
 * 4. STATUS MAPPING — `STATUS_MAP` below is a best-guess mapping from what
 *    Ninja Van's tracking statuses are commonly documented as, to this app's
 *    shared ShipmentStatus enum. Verify the exact status strings the live
 *    webhook payload actually sends (casing, exact wording) — an unmapped
 *    status currently falls through to "IN_TRANSIT" as a safe default rather
 *    than silently dropping the update, but that's a stopgap, not a fix.
 * 5. COD REMITTANCE WEBHOOK — Ninja Van sends COD collection and remittance
 *    as separate events from delivery status in most integrations. This
 *    adapter's `handleWebhook` only handles delivery-status-shaped payloads;
 *    a COD remittance webhook (separate endpoint/payload shape) still needs
 *    to be added once its schema is confirmed, writing into the
 *    CodRemittance model (see prisma/schema.prisma).
 * 6. RATE QUOTING — no `getRate()` is implemented below, so this provider
 *    won't appear in checkout's shipping-method picker (see
 *    getShippingOptionsFor in ../registry.ts) even once activated, until a
 *    real rate-quote call against Ninja Van's API is added. Don't stub a
 *    flat guessed number in here — an unverified rate shown to buyers as a
 *    real price is worse than the option not appearing at all.
 * ============================================================================
 */

const TOKEN_URL = "https://api.ninjavan.co/PH/2.0/oauth/access_token"; // ⚠️ VERIFY against live docs
const CREATE_ORDER_URL = "https://api.ninjavan.co/PH/4.1/orders"; // ⚠️ VERIFY against live docs

// ⚠️ VERIFY exact strings against a real webhook payload before activation —
// see note 4 above. Unrecognized statuses map to IN_TRANSIT rather than
// throwing, so an unexpected string doesn't break the whole webhook handler.
const STATUS_MAP: Record<string, ShipmentStatus> = {
  "Pending Pickup": "PENDING",
  "Picked Up": "IN_TRANSIT",
  "Arrived at Origin Hub": "IN_TRANSIT",
  "On Vehicle for Delivery": "IN_TRANSIT",
  "Successful Delivery": "DELIVERED",
  "Unsuccessful Delivery": "FAILED_DELIVERY",
  "Return to Sender": "RETURNED",
  Cancelled: "FAILED_DELIVERY",
};

/** HMAC-SHA256 over the raw (unparsed) request body, compared against a
 * signature header using a timing-safe comparison so response-time can't
 * leak how much of the signature matched. Requires `rawBody` (not the parsed
 * JSON) because re-serializing a parsed object won't byte-for-byte match
 * what Ninja Van actually signed. Returns false (reject) whenever
 * NINJAVAN_WEBHOOK_SECRET isn't set — a webhook can't be "trusted by
 * default" just because no secret was configured yet. ⚠️ Header name and
 * signing scheme are unverified against real docs — see note 3 above. */
export function verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
  const secret = process.env.NINJAVAN_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = headers["x-ninjavan-hmac-sha256"] ?? headers["x-ninjavan-signature"];
  if (!signature) return false;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return timingSafeEqual(expectedBuf, signatureBuf);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.NINJAVAN_CLIENT_ID,
      client_secret: process.env.NINJAVAN_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new Error(`Ninja Van auth failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

export const ninjaVanProvider: ShippingProvider = {
  id: "NINJAVAN",
  label: "Ninja Van",
  supportsBooking: true,
  supportsCOD: true,

  async createShipment(input) {
    try {
      const token = await getAccessToken();
      // ⚠️ Payload shape is a best-effort approximation of Ninja Van's
      // documented Create Order request — verify field names/structure
      // against the live API before activation (see note 2 above).
      const res = await fetch(CREATE_ORDER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: "Parcel",
          service_level: "Standard",
          requested_tracking_number: input.trackingNumber || undefined,
          reference: { merchant_order_number: input.orderId },
          from: {
            name: input.pickup.name,
            phone_number: input.pickup.phone,
            address: {
              address1: input.pickup.address,
              city: input.pickup.city,
              state: input.pickup.province,
              postcode: input.pickup.postalCode,
              country: "PH",
            },
          },
          to: {
            name: input.dropoff.name,
            phone_number: input.dropoff.phone,
            address: {
              address1: input.dropoff.address,
              city: input.dropoff.city,
              state: input.dropoff.province,
              postcode: input.dropoff.postalCode,
              country: "PH",
            },
          },
          parcel_job: {
            is_pickup_required: true,
            cash_on_delivery: input.isCOD ? input.codAmount : undefined,
            insured_value: input.declaredValue,
          },
        }),
      });
      if (!res.ok) return { success: false, status: "PENDING", error: `Ninja Van create-order failed: ${res.status}` };
      const data = (await res.json()) as { tracking_number: string; id?: string };
      return { success: true, status: "PENDING", trackingNumber: data.tracking_number, providerRef: data.id };
    } catch (e) {
      return { success: false, status: "PENDING", error: e instanceof Error ? e.message : "Ninja Van request failed." };
    }
  },

  async getTrackingStatus() {
    // Ninja Van integrations are typically webhook-driven (see handleWebhook)
    // rather than polled — leaving this unimplemented until there's a
    // confirmed polling endpoint worth using as a fallback.
    return null;
  },

  async handleWebhook(payload) {
    // Signature verification happens in the route handler before this is
    // ever called (see verifyWebhookSignature above) — this assumes an
    // already-authenticated payload.
    const body = payload as { tracking_number?: string; order_id?: string; status?: string; timestamp?: string };
    if (!body.status) return null;

    const status = STATUS_MAP[body.status] ?? "IN_TRANSIT";
    const update: TrackingUpdate = {
      status,
      deliveredAt: status === "DELIVERED" ? new Date(body.timestamp ?? Date.now()) : undefined,
    };
    return { trackingNumber: body.tracking_number, providerRef: body.order_id, update };
  },
};

/** Ninja Van's COD handling fee — deducted by Ninja Van from what it remits
 * to ATBP, tracked on CodRemittance.handlingFee for visibility. Per business
 * decision this is platform-absorbed (ATBP eats it, not the seller) — see
 * the ₱15 COD processing fee added to lib/services/commission.ts instead,
 * which is how sellers' side of COD's extra handling cost is actually
 * recouped. ⚠️ VERIFY this rate against your live Ninja Van merchant
 * agreement before activation — it varies by contract. */
export const NINJAVAN_COD_HANDLING_RATE = 0.0275;
