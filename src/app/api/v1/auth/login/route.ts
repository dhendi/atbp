import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { issueMobileTokens } from "@/lib/mobile-auth";
import { isBlockedRole } from "@/lib/auth-roles";

/**
 * Mobile app login — email/password only for v1 (mirrors lib/auth.ts's
 * credentials path). Deliberately does NOT cover: 2FA accounts (admins;
 * refused below with a clear error rather than silently bypassing the
 * second factor), Google/Facebook OAuth, or phone-OTP login. Those need
 * their own mobile flows later (native Google/Apple sign-in SDKs, an OTP
 * screen) — see docs/API_CONTRACT.md in the atbp-mobile project.
 */
const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});

// Same timing-safe-ish pattern as the web credentials provider: always
// bcrypt.compare against *something*, so a nonexistent email doesn't return
// faster than a wrong password and leak which emails are registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", 10);

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await checkRateLimit(`mobile-login:${ip}`, 10, 15 * 60_000))) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { twoFactorAuth: { select: { verifiedAt: true } } },
  });
  const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH);
  if (!user || !valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (isBlockedRole(user.role)) {
    return NextResponse.json({ error: "This account can't sign in right now." }, { status: 403 });
  }
  if (user.twoFactorAuth?.verifiedAt) {
    // v1 has no TOTP-entry screen yet. Refuse rather than silently skip 2FA.
    return NextResponse.json({ error: "This account has two-factor authentication enabled. Sign in on the ATBP website for now." }, { status: 403 });
  }

  const tokens = await issueMobileTokens(user);
  return NextResponse.json({
    ...tokens,
    user: { id: user.id, name: user.name, username: user.username, email: user.email, avatarUrl: user.avatarUrl, role: user.role },
  });
}
