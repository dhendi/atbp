import { NextResponse } from "next/server";
import { ninjaVanProvider, verifyWebhookSignature } from "@/lib/shipping/providers/ninjavan";
import { applyTrackingUpdate } from "@/lib/shipping/lifecycle";
import { getShippingProvider } from "@/lib/shipping/registry";

/**
 * Inbound Ninja Van tracking webhook. Registering this URL with Ninja Van and
 * everything downstream of it only matters once NINJAVAN_ACTIVE is true (see
 * lib/shipping/registry.ts) — until then this route exists but nothing sends
 * it real traffic.
 *
 * Every request is HMAC-verified (see verifyWebhookSignature in
 * lib/shipping/providers/ninjavan.ts) against NINJAVAN_WEBHOOK_SECRET before
 * its payload is trusted — an unsigned or mismatched request is rejected
 * with 401 and never reaches handleWebhook(). ⚠️ The header name and signing
 * scheme that function assumes are unverified against Ninja Van's real docs
 * — confirm both before activation.
 */
export async function POST(request: Request) {
  // Registered-but-inactive on purpose — see NINJAVAN_ACTIVE. Returning 200
  // regardless of activation avoids the courier retrying forever against a
  // route that will just keep rejecting it.
  if (!getShippingProvider("NINJAVAN")) return NextResponse.json({ ok: true, ignored: true });

  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  if (!verifyWebhookSignature(rawBody, headers)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const result = await ninjaVanProvider.handleWebhook?.(payload, headers);
  if (!result) return NextResponse.json({ ok: true, ignored: true });

  await applyTrackingUpdate(
    { trackingNumber: result.trackingNumber, providerRef: result.providerRef },
    result.update
  );
  return NextResponse.json({ ok: true });
}
