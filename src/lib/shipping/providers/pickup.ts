import type { ShippingProvider } from "../types";

/** Pickup directly from the seller — never an ATBP-operated location. No
 * courier, no waybill: "creating a shipment" here just means generating the
 * code the buyer shows the seller at handover, reusing the Shipment.trackingNumber
 * column rather than adding a new one. See createPickupShipment in
 * ../lifecycle.ts for when this actually gets called (order creation, not a
 * seller "shipped" step — there isn't one for a pickup). */
export const pickupProvider: ShippingProvider = {
  id: "PICKUP",
  label: "Pickup",
  supportsBooking: false,
  supportsCOD: false,

  async createShipment() {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    return { success: true, status: "PENDING", trackingNumber: code };
  },
};
