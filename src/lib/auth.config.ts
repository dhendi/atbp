import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/prisma";

/**
 * Shared auth config, used both by lib/auth.ts (full config, adds the
 * Credentials provider) and by proxy.ts (route gating before a page renders).
 *
 * As of Next.js 16, Proxy (formerly Middleware) always runs on the Node.js
 * runtime — the `runtime` config option isn't even accepted there anymore —
 * so this file can safely use Prisma. That wasn't true on older Next.js
 * versions, where Middleware ran on the Edge runtime and couldn't bundle
 * Prisma or bcrypt; if you're reading this on an app still using Edge
 * Middleware, the jwt callback's revocation check below needs to move
 * somewhere Node-only instead.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Only ever follow an absolute URL that's actually on this origin —
      // callbackUrl comes straight from the query string (see
      // social-login-buttons.tsx), so without this check `?callbackUrl=
      // https://evil.example` would send a user off-site right after a
      // successful sign-in. NextAuth's own default already restricts to
      // baseUrl's origin; this override exists to keep that guarantee
      // explicit rather than relying on it staying the default.
      try {
        return new URL(url).origin === new URL(baseUrl).origin ? url : baseUrl;
      } catch {
        return baseUrl;
      }
    },
    jwt: async ({ token, user, trigger, session }) => {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: string }).role;
        token.username = (user as { username: string }).username;
        token.sessionVersion = (user as unknown as { sessionVersion: number }).sessionVersion;
      }
      // Client calls next-auth/react's update({ name, image }) right after a
      // profile edit succeeds — merge it into the token so the session (and
      // anything reading it, like the top nav) reflects the change immediately
      // instead of waiting for the next full sign-in.
      if (trigger === "update" && session) {
        if (session.name) token.name = session.name;
        if (session.image !== undefined) token.picture = session.image;
      }

      // Revocable sessions: re-check against the DB on every request rather
      // than trusting the token for its full lifetime. Suspending a user (or
      // any admin action that bumps sessionVersion) invalidates their
      // existing session immediately, everywhere — including a role change,
      // since we always refresh token.role from the current DB value too.
      if (token.id) {
        const current = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, sessionVersion: true, twoFactorAuth: { select: { verifiedAt: true } } },
        });
        if (!current || current.sessionVersion !== token.sessionVersion) {
          return null;
        }
        token.role = current.role;
        token.has2FA = !!current.twoFactorAuth?.verifiedAt;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
        session.user.has2FA = !!token.has2FA;
      }
      return session;
    },
  },
};
