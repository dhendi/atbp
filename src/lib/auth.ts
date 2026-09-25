import { isBlockedRole } from "@/lib/auth-roles";
import { randomUUID } from "crypto";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { verifyTotp } from "@/lib/services/totp";
import { normalizePhMobile } from "@/lib/phone";
import { checkRateLimit } from "@/lib/services/rate-limit";
import { claimGuestOrders } from "@/lib/services/guest-checkout";

const LOGIN_RATE_LIMIT = 5; // failed attempts per email per rolling window
const LOGIN_RATE_WINDOW_MS = 15 * 60_000;

async function isLoginRateLimited(email: string) {
  const count = await prisma.loginAttempt.count({
    where: { email, createdAt: { gte: new Date(Date.now() - LOGIN_RATE_WINDOW_MS) } },
  });
  return count >= LOGIN_RATE_LIMIT;
}

/** Checks a 2FA code against the account's TOTP secret, falling back to its
 * one-time recovery codes. This is the authoritative 2FA gate — the client
 * flow (checkPasswordAction) is only there for UX, so this has to enforce
 * the requirement on its own even if someone calls signIn() directly. */
async function verifyTwoFactorCode(userId: string, code: string | undefined): Promise<boolean> {
  const record = await prisma.twoFactorAuth.findUnique({ where: { userId } });
  if (!record?.verifiedAt) return true; // 2FA not enabled for this account
  if (!code) return false;

  if (verifyTotp(record.secret, code)) return true;

  const recoveryCodes = record.recoveryCodes as string[];
  for (let i = 0; i < recoveryCodes.length; i++) {
    if (await bcrypt.compare(code.trim(), recoveryCodes[i])) {
      const remaining = [...recoveryCodes.slice(0, i), ...recoveryCodes.slice(i + 1)];
      await prisma.twoFactorAuth.update({ where: { userId }, data: { recoveryCodes: remaining } });
      return true;
    }
  }
  return false;
}

/** True when this account has 2FA turned on. The password path enforces TOTP
 * itself (verifyTwoFactorCode); the OAuth and emailed/texted-code paths have
 * no TOTP step, so they must refuse these accounts outright, otherwise anyone
 * who can read the inbox (or holds the Google login) walks straight past 2FA. */
async function hasTwoFactorEnabled(userId: string): Promise<boolean> {
  const record = await prisma.twoFactorAuth.findUnique({ where: { userId } });
  return !!record?.verifiedAt;
}

/** An account created by password (or guest conversion) whose email was never
 * verified may have been registered by someone who doesn't own that inbox.
 * When the real owner later proves ownership through Google or an emailed
 * code, that password belongs to the squatter, so it's rotated to an unusable
 * value and every existing session is revoked (sessionVersion bump) before
 * the owner is let in. Verified accounts are left untouched. */
async function neutralizeUnverifiedTakeover(user: { id: string; emailVerifiedAt: Date | null }) {
  if (user.emailVerifiedAt) return;
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(randomUUID(), 10), sessionVersion: { increment: 1 } },
  });
}

// Compared against when the email doesn't exist, so a missing account costs
// the same bcrypt time as a wrong password and login timing doesn't reveal
// which emails are registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-password", 10);

/** Turns a name/email into a valid, available username — Google/Facebook
 * profiles don't come with one, unlike our own signup form which requires
 * the user to pick one directly. */
async function uniqueUsernameFrom(base: string) {
  const slug = base.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 15) || "user";
  let candidate = slug;
  let i = 0;
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    i++;
    candidate = `${slug}${i}`;
  }
  return candidate;
}

/** First OAuth sign-in with a given email creates the same kind of User row
 * signupAction does (down to giving them a cart); every sign-in after that
 * just matches the existing row by email — so a Google and a Facebook login
 * with the same address land on one account, same as if they'd used the
 * password form. The random password is never shown or usable for a
 * Credentials login; it only exists because passwordHash is required. */
async function findOrCreateOAuthUser(email: string, name: string, image: string | null) {
  const normalizedEmail = email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return existing;

  const username = await uniqueUsernameFrom(name || normalizedEmail.split("@")[0]);
  const passwordHash = await bcrypt.hash(randomUUID(), 10);
  const user = await prisma.user.create({
    data: {
      email: normalizedEmail, passwordHash, name: name || username, username, avatarUrl: image ?? undefined,
      // Google/Facebook already verified this address before ever handing it
      // to us — no separate email-verification step needed. termsAgreedAt is
      // implicit consent at first sign-in, same as the email/phone OTP paths
      // (see findOrCreateByEmail/findOrCreateByPhone below); the explicit
      // checkbox gate lives on the /signup page's button, not in here, since
      // this same code path also runs for a first-time OAuth login from /login.
      emailVerifiedAt: new Date(),
      termsAgreedAt: new Date(),
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

/** First OTP verification for a given email creates an account, same shape
 * as findOrCreateOAuthUser — email is already the app's normal unique login
 * identifier (unlike phone, which needed a placeholder-email trick), so this
 * is simpler: match by email directly, or create with a random unusable
 * password exactly like OAuth sign-in does. */
async function findOrCreateByEmail(email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;

  const username = await uniqueUsernameFrom(email.split("@")[0]);
  const passwordHash = await bcrypt.hash(randomUUID(), 10);
  const user = await prisma.user.create({
    // termsAgreedAt is implicit consent at first sign-in via this method —
    // same reasoning as findOrCreateOAuthUser above.
    data: { email, passwordHash, name: "ATBP Member", username, termsAgreedAt: new Date() },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

/** First OTP verification for a given phone creates an account (down to the
 * cart), same shape as findOrCreateOAuthUser above; every verification after
 * that just logs into the existing row. There's no reliable signal linking a
 * phone number to an email/OAuth account, so this never attempts to merge
 * into one — a buyer who first signs up by phone and later also uses Google
 * with a different address ends up with two separate accounts, same as
 * they would with two different emails. email/passwordHash stay required
 * columns (schema-wide change to make them nullable was out of scope for
 * this), so both are filled with unusable placeholders exactly like OAuth
 * sign-in already does with its random password. */
async function findOrCreateByPhone(phone: string) {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return existing;

  const digits = phone.replace(/\D/g, "");
  const username = await uniqueUsernameFrom(`user${digits.slice(-9)}`);
  const passwordHash = await bcrypt.hash(randomUUID(), 10);
  // See isPlaceholderEmail in lib/phone.ts — that's what recognizes this domain.
  const placeholderEmail = `phone-${digits}@no-email.atbp.local`;
  const user = await prisma.user.create({
    data: {
      email: placeholderEmail,
      passwordHash,
      name: "ATBP Member",
      username,
      phone,
      phoneVerifiedAt: new Date(),
      // Implicit consent at first sign-in via this method — same reasoning
      // as findOrCreateOAuthUser above.
      termsAgreedAt: new Date(),
    },
  });
  await prisma.cart.create({ data: { userId: user.id } });
  return user;
}

// Read by the login/signup server components too, so a button for a
// not-yet-configured provider is never rendered rather than rendered and
// then erroring on click.
export const googleLoginEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const facebookLoginEnabled = !!(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET);

const oauthProviders = [
  googleLoginEnabled ? Google({ clientId: process.env.GOOGLE_CLIENT_ID!, clientSecret: process.env.GOOGLE_CLIENT_SECRET! }) : null,
  facebookLoginEnabled ? Facebook({ clientId: process.env.FACEBOOK_CLIENT_ID!, clientSecret: process.env.FACEBOOK_CLIENT_SECRET! }) : null,
].filter((p) => p !== null);

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ user, account, profile }) => {
      const provider = account?.provider;
      if (provider !== "google" && provider !== "facebook") return true;
      if (!user.email) return false;
      // Never trust a provider email the provider itself hasn't verified:
      // matching accounts by email would otherwise let someone attach an
      // unverified address to a victim's existing account.
      if (provider === "google" && (profile as { email_verified?: boolean } | undefined)?.email_verified !== true) return false;

      let dbUser = await findOrCreateOAuthUser(user.email, user.name ?? "", user.image ?? null);
      if (isBlockedRole(dbUser.role)) return false;
      // No TOTP step exists on this path, so an account with 2FA on must use
      // password + code instead.
      if (await hasTwoFactorEnabled(dbUser.id)) return false;

      // Matched an existing account (e.g. one originally created by password
      // signup, never verified) rather than creating a new one. Google/
      // Facebook just proved they own this address, so it's verified now too,
      // same "prove it once, keep it forever" shape as the OTP providers. Any
      // password that account was registered with is the squatter's, though.
      if (!dbUser.emailVerifiedAt) {
        await neutralizeUnverifiedTakeover(dbUser);
        dbUser = await prisma.user.update({ where: { id: dbUser.id }, data: { emailVerifiedAt: new Date() } });
        await claimGuestOrders(dbUser.id, dbUser.email);
      }

      // Overwrite the provider-supplied fields with our own DB-backed identity
      // so the jwt callback (which runs right after with this same `user`)
      // stores our id/role/username/sessionVersion, not Google's/Facebook's.
      user.id = dbUser.id;
      (user as unknown as { role: string }).role = dbUser.role;
      (user as unknown as { username: string }).username = dbUser.username;
      (user as unknown as { sessionVersion: number }).sessionVersion = dbUser.sessionVersion;
      return true;
    },
  },
  providers: [
    ...oauthProviders,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        code: { label: "2FA code", type: "text" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        const code = credentials?.code as string | undefined;
        if (!email || !password) return null;
        const normalizedEmail = email.toLowerCase();

        // Checked before touching the password so a flood of attempts can't
        // be used to keep probing — failure here reads identically to a
        // wrong password to the client, on purpose.
        if (await isLoginRateLimited(normalizedEmail)) return null;

        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_PASSWORD_HASH) && !!user;
        const twoFactorOk = user ? await verifyTwoFactorCode(user.id, code) : false;
        if (!user || !valid || !twoFactorOk || isBlockedRole(user.role)) {
          await prisma.loginAttempt.create({ data: { email: normalizedEmail } });
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl ?? undefined,
          username: user.username,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
    Credentials({
      id: "phone-otp",
      name: "Mobile number",
      credentials: {
        phone: { label: "Mobile number", type: "text" },
        code: { label: "Code", type: "text" },
      },
      authorize: async (credentials) => {
        const rawPhone = credentials?.phone as string | undefined;
        const code = credentials?.code as string | undefined;
        if (!rawPhone || !code) return null;
        const phone = normalizePhMobile(rawPhone);
        if (!phone) return null;

        // Same anti-brute-force shape as isLoginRateLimited: checked before
        // touching any token, and a lockout here reads identically to a wrong
        // code to the client.
        if (!(await checkRateLimit(`phone-otp-verify:${phone}`, 10, 15 * 60_000))) return null;

        const token = await prisma.phoneOtpToken.findFirst({
          where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        if (!token || token.attempts >= 5) return null;

        const valid = await bcrypt.compare(code.trim(), token.codeHash);
        if (!valid) {
          await prisma.phoneOtpToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
          return null;
        }
        await prisma.phoneOtpToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });

        const user = await findOrCreateByPhone(phone);
        if (isBlockedRole(user.role)) return null;
        if (await hasTwoFactorEnabled(user.id)) return null;
        // A number that was previously unverified (e.g. entered for shipping)
        // is now proven — record it the same way a first-time verification would.
        if (!user.phoneVerifiedAt) {
          await prisma.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl ?? undefined,
          username: user.username,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
    Credentials({
      id: "email-otp",
      name: "Email code",
      credentials: {
        email: { label: "Email", type: "email" },
        code: { label: "Code", type: "text" },
      },
      authorize: async (credentials) => {
        const rawEmail = credentials?.email as string | undefined;
        const code = credentials?.code as string | undefined;
        if (!rawEmail || !code) return null;
        const email = rawEmail.trim().toLowerCase();

        // Same anti-brute-force shape as the other two providers: checked
        // before touching any token, and a lockout here reads identically to
        // a wrong code to the client.
        if (!(await checkRateLimit(`email-otp-verify:${email}`, 10, 15 * 60_000))) return null;

        const token = await prisma.emailOtpToken.findFirst({
          where: { email, consumedAt: null, expiresAt: { gt: new Date() } },
          orderBy: { createdAt: "desc" },
        });
        if (!token || token.attempts >= 5) return null;

        const valid = await bcrypt.compare(code.trim(), token.codeHash);
        if (!valid) {
          await prisma.emailOtpToken.update({ where: { id: token.id }, data: { attempts: { increment: 1 } } });
          return null;
        }
        await prisma.emailOtpToken.update({ where: { id: token.id }, data: { consumedAt: new Date() } });

        let user = await findOrCreateByEmail(email);
        if (isBlockedRole(user.role)) return null;
        // No TOTP step on this path: an account with 2FA on must use
        // password + code, otherwise inbox access alone would bypass 2FA.
        if (await hasTwoFactorEnabled(user.id)) return null;
        // An account that signed up via password (never verified) is now
        // proven to this inbox's owner. Whatever password it was registered
        // with may belong to a squatter, so that's neutralized first.
        if (!user.emailVerifiedAt) {
          await neutralizeUnverifiedTakeover(user);
          user = await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
          await claimGuestOrders(user.id, user.email);
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl ?? undefined,
          username: user.username,
          role: user.role,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
});
