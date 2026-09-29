import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyRefreshToken, issueMobileTokens } from "@/lib/mobile-auth";
import { isBlockedRole } from "@/lib/auth-roles";

/** Exchanges a still-valid refresh token for a new access token (and a
 * rotated refresh token, so a captured old one stops working the moment the
 * legitimate app refreshes). The app calls this in the background whenever
 * an API call comes back 401 with an expired access token. */
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const refreshToken = (raw as { refreshToken?: unknown } | null)?.refreshToken;
  if (typeof refreshToken !== "string") return NextResponse.json({ error: "Missing refresh token." }, { status: 400 });

  const payload = await verifyRefreshToken(refreshToken);
  if (!payload) return NextResponse.json({ error: "Invalid or expired session. Please log in again." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, role: true, sessionVersion: true } });
  if (!user || user.sessionVersion !== payload.sessionVersion || isBlockedRole(user.role)) {
    return NextResponse.json({ error: "Invalid or expired session. Please log in again." }, { status: 401 });
  }

  const tokens = await issueMobileTokens(user);
  return NextResponse.json(tokens);
}
