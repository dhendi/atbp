/** Shared internal shipment status — every ShippingProvider adapter maps its
 * own courier's vocabulary into this, so the rest of the app (order UI,
 * returns/payout logic) never depends on a specific courier's status names. */
export type ShipmentStatus = "PENDING" | "IN_TRANSIT" | "DELIVERED" | "FAILED_DELIVERY" | "RETURNED";

export interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface CreateShipmentInput {
  orderId: string;
  declaredValue: number;
  isCOD: boolean;
  codAmount?: number;
  pickup: ShippingAddress;
  dropoff: ShippingAddress;
  /** Seller-entered, manual provider only — ignored by providers that book their own tracking number. */
  trackingNumber?: string;
  /** Seller-selected preset/free-text courier name, manual provider only. */
  courierName?: string;
}

export interface CreateShipmentResult {
  success: boolean;
  error?: string;
  status: ShipmentStatus;
  trackingNumber?: string;
  /** The courier's own shipment/order id — unused by the manual provider. */
  providerRef?: string;
}

export interface TrackingUpdate {
  status: ShipmentStatus;
  deliveredAt?: Date;
  codCollectionStatus?: "PENDING" | "COLLECTED" | "FAILED" | "REMITTED";
}

export interface WebhookResult {
  /** Which shipment this update applies to — matched by trackingNumber or providerRef, adapter's choice. */
  trackingNumber?: string;
  providerRef?: string;
  update: TrackingUpdate;
}

export interface ShippingRateEstimate {
  fee: number;
  /** Estimated transit days, where known — omit rather than guess. */
  etaDays?: number;
}

export interface ShippingProvider {
  id: string;
  label: string;
  /** Can this provider book a real shipment/generate a label, or does it just record a seller-entered tracking number? */
  supportsBooking: boolean;
  /** Can this provider collect cash on delivery and remit it to ATBP? */
  supportsCOD: boolean;
  /** Quotes this provider's rate for checkout's shipping-method picker (see
   * getShippingOptionsFor in ./registry). Optional — a provider with no rate
   * quote implemented simply doesn't appear as a checkout option yet. */
  getRate?(input: { declaredValue: number }): Promise<ShippingRateEstimate> | ShippingRateEstimate;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  /** Poll-based status check — optional; a provider with a webhook may not need this. */
  getTrackingStatus?(shipment: { trackingNumber: string | null; providerRef: string | null }): Promise<TrackingUpdate | null>;
  /** Normalizes an inbound webhook payload into a shared-shape update. Verifying the payload's authenticity (signature, secret) is the adapter's own responsibility before returning a result. */
  handleWebhook?(payload: unknown, headers: Record<string, string>): Promise<WebhookResult | null>;
}
