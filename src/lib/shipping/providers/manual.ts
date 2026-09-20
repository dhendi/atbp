import type { ShippingProvider } from "../types";

/** The only active provider at launch. Doesn't book anything or talk to any
 * courier API — it just records what the seller typed in. `createShipment`
 * puts the shipment straight into IN_TRANSIT since the seller is asserting
 * they've already handed the parcel to the courier by the time they fill
 * this in; there's no earlier "label created, awaiting pickup" state to
 * represent without real courier integration. */
// The only shipping fee that exists at launch — checkout's shipping-method
// picker shows this as the (currently sole) option via getRate below.
export const MANUAL_SHIPPING_FLAT_FEE = 90;

export const manualProvider: ShippingProvider = {
  id: "MANUAL",
  label: "Standard Shipping",
  supportsBooking: false,
  supportsCOD: false,

  getRate() {
    return { fee: MANUAL_SHIPPING_FLAT_FEE };
  },

  async createShipment(input) {
    if (!input.trackingNumber?.trim() || !input.courierName?.trim()) {
      return { success: false, status: "PENDING", error: "Tracking number and courier are required." };
    }
    return { success: true, status: "IN_TRANSIT", trackingNumber: input.trackingNumber.trim() };
  },

  // No getTrackingStatus/handleWebhook — manual shipments only ever change
  // status via the buyer's own confirmation or the lazy auto-confirm check
  // (see lib/shipping/lifecycle.ts), never from an external signal.
};

/** Presets shown in the seller's ship-order form — free text is still
 * accepted for anything not listed (see the courier select in order-row.tsx). */
export const MANUAL_COURIER_PRESETS = ["Ninja Van", "J&T Express", "Flash Express", "LBC", "GrabExpress", "Other"];
