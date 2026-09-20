import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAdClick } from "@/lib/services/ads";

// The destination is always the ad's own stored destinationUrl, never a
// client-supplied query param — a "to" param here would be an open-redirect
// gadget usable against ATBP's own domain.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ad = await prisma.advertisement.findUnique({ where: { id } });
  if (!ad) return NextResponse.redirect(new URL("/", req.url));

  await logAdClick(id);
  return NextResponse.redirect(ad.destinationUrl);
}
