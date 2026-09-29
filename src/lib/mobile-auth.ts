import { SignJWT, jwtVerify } from "jose";
import { isBlockedRole } from "@/lib/auth-roles";

/**
 * Bearer-token auth for the mobile app's REST API (src/app/api/v1/**), kept
 * entirely separate from NextAuth's cookie-based web session (lib/auth.ts) —
 * a native app has no cookie jar shared with a browser, so it needs tokens it
 * can store itself (expo-secure-store) and send as `Authorization: Bearer …`.
 *
 * Two tokens, same shape as most mobile APIs:
 *  - Access token: short-lived (2h), sent on every request, verified without
 *    hitting the DB except for the one extra check below.
 *  - Refresh token: long-lived (30d), sent only to /api/v1/auth/refresh to
 *    mint a new access token. Stored on-device, never sent elsewhere.
 *
 * Revocation reuses the *existing* sessionVersion mechanism (auth.config.ts)
 * instead of a new token-blocklist table: every access/refresh token embeds
 * the sessionVersion it was issued under, and a request is refused the
 * moment that number no longer matches the DB (password change, admin
 * suspend, account deletion, "log out everywhere"). This is the same
 * revocation the web session already gets — nothing mobile-specific to keep
 * in sync. The trade-off: there's no way to revoke one device's refresh
 * token without also signing out the web session and every other device,
 * since they all share one counter. Good enough for v1; a per-device
 * refresh-token table is the natural upgrade if that trade-off ever matters.
 */

const ACCESS_TOKEN_TTL = "2h";
const REFRESH_TOKEN_TTL = "30d";

function secretKey() {
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!secret) throw new Error("MOBILE_JWT_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export interface MobileTokenPayload {
  sub: string; // userId
  sessionVersion: number;
  role: string;
  type: "access" | "refresh";
}

async function signToken(payload: Omit<MobileTokenPayload, "type">, type: "access" | "refresh", ttl: string) {
  return new SignJWT({ ...payload, type })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secretKey());
}

export async function issueMobileTokens(user: { id: string; sessionVersion: number; role: string }) {
  const base = { sub: user.id, sessionVersion: user.sessionVersion, role: user.role };
  const [accessToken, refreshToken] = await Promise.all([
    signToken(base, "access", ACCESS_TOKEN_TTL),
    signToken(base, "refresh", REFRESH_TOKEN_TTL),
  ]);
  return { accessToken, refreshToken };
}

/** Verifies a token's signature/expiry and that it's the expected type.
 * Does NOT check sessionVersion against the DB — callers that need the
 * "is this still valid right now" guarantee (every real API route) should
 * use requireMobileUser below instead, which does. */
async function verifyToken(token: string, type: "access" | "refresh"): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (payload.type !== type || typeof payload.sub !== "string") return null;
    return payload as unknown as MobileTokenPayload;
  } catch {
    return null;
  }
}

export const verifyAccessToken = (token: string) => verifyToken(token, "access");
export const verifyRefreshToken = (token: string) => verifyToken(token, "refresh");

/** The one function every v1 API route should call. Reads the Bearer token,
 * verifies it, then re-checks role/sessionVersion against the live DB row —
 * mirrors the web session's jwt callback (auth.config.ts) so a suspended,
 * deleted, or signed-out-everywhere account is refused immediately instead
 * of whenever its 2h access token happens to expire. */
export async function requireMobileUser(
  request: Request
): Promise<{ id: string; role: string } | { error: string; status: number }> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return { error: "Missing or invalid Authorization header.", status: 401 };

  const payload = await verifyAccessToken(token);
  if (!payload) return { error: "Invalid or expired token.", status: 401 };

  const { prisma } = await import("@/lib/prisma");
  const current = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { role: true, sessionVersion: true },
  });
  if (!current || current.sessionVersion !== payload.sessionVersion || isBlockedRole(current.role)) {
    return { error: "Session is no longer valid. Please log in again.", status: 401 };
  }
  return { id: payload.sub, role: current.role };
}
