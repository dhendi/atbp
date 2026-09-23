import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      username: string;
      has2FA: boolean;
      // Named distinctly from NextAuth's own built-in `emailVerified` (a
      // `Date | null` on its core User/AdapterUser types) to avoid an
      // unsatisfiable boolean-vs-Date intersection with DefaultSession["user"].
      hasVerifiedEmail: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
    username: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    username: string;
    has2FA: boolean;
    hasVerifiedEmail: boolean;
  }
}
